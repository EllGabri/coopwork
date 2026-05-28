import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const BUCKET = 'ged-documents';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

const WRITE_ROLES = ['super_admin', 'director', 'manager'];
const READ_ROLES = ['super_admin', 'director', 'manager', 'compliance'];

@Injectable()
export class DocumentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(
    tenantId: string,
    role: string,
    filters?: { categoryId?: string; search?: string },
  ) {
    if (!READ_ROLES.includes(role)) throw new ForbiddenException('Acesso negado ao GED');

    let query = this.supabase.admin
      .from('documents')
      .select(
        'id, title, description, category_id, department_id, owner_id, status, current_version, tags, review_date, expiration_date, size_bytes, mime_type, created_at, updated_at',
      )
      .eq('tenant_id', tenantId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters?.search) {
      query = query.textSearch('search_vector', filters.search, {
        type: 'websearch',
        config: 'portuguese',
      });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findOne(id: string, tenantId: string, role: string) {
    if (!READ_ROLES.includes(role)) throw new ForbiddenException('Acesso negado ao GED');

    const { data, error } = await this.supabase.admin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async upload(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    tenantId: string,
    userId: string,
    role: string,
  ) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para enviar documentos');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Arquivo deve ser menor que 50 MB');
    }

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const objectPath = `${tenantId}/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: doc, error: insertError } = await this.supabase.admin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        department_id: dto.department_id ?? null,
        category_id: dto.category_id ?? null,
        title: dto.title,
        description: dto.description ?? null,
        storage_path: objectPath,
        mime_type: file.mimetype,
        size_bytes: file.size,
        owner_id: userId,
        tags: dto.tags ?? [],
        review_date: dto.review_date ?? null,
        expiration_date: dto.expiration_date ?? null,
        current_version: 1,
      })
      .select()
      .single();

    if (insertError || !doc) throw new Error(insertError?.message ?? 'Falha ao salvar documento');

    // Create v1 record
    await this.supabase.admin.from('document_versions').insert({
      document_id: doc.id,
      version: 1,
      storage_path: objectPath,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: userId,
      comment: 'Versão inicial',
    });

    await this.logAccess(doc.id, userId, 'edit', null);
    return doc;
  }

  async getSignedDownloadUrl(
    id: string,
    tenantId: string,
    userId: string,
    role: string,
    ipAddress: string | null,
  ) {
    const doc = await this.findOne(id, tenantId, role);

    if (!doc.storage_path) throw new BadRequestException('Documento sem arquivo associado');

    const { data, error } = await this.supabase.admin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) throw new Error('Falha ao gerar URL de download');

    await this.logAccess(id, userId, 'download', ipAddress);
    return { signedUrl: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
  }

  async update(id: string, dto: UpdateDocumentDto, tenantId: string, userId: string, role: string) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para editar documentos');

    await this.findOne(id, tenantId, role);

    const { data, error } = await this.supabase.admin
      .from('documents')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Falha ao atualizar documento');
    await this.logAccess(id, userId, 'edit', null);
    return data;
  }

  async softDelete(id: string, tenantId: string, userId: string, role: string) {
    if (!['super_admin', 'director'].includes(role)) {
      throw new ForbiddenException('Sem permissão para excluir documentos');
    }
    await this.findOne(id, tenantId, role);
    const { error } = await this.supabase.admin
      .from('documents')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    await this.logAccess(id, userId, 'delete', null);
  }

  async getAuditLog(id: string, tenantId: string, role: string) {
    if (!['super_admin', 'compliance'].includes(role)) {
      throw new ForbiddenException('Acesso ao log restrito');
    }
    await this.findOne(id, tenantId, role);
    const { data, error } = await this.supabase.admin
      .from('document_access_log')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async logAccess(documentId: string, userId: string, action: string, ipAddress: string | null) {
    await this.supabase.admin.from('document_access_log').insert({
      document_id: documentId,
      user_id: userId,
      action,
      ip_address: ipAddress,
    });
  }
}
