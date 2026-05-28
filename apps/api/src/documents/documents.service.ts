import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
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
        'id, title, description, category_id, department_id, owner_id, status, current_version, tags, review_date, expiration_date, size_bytes, mime_type, is_flowchart, created_at, updated_at',
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

  async findOne(id: string, tenantId: string, role: string, userId?: string) {
    const hasRoleAccess = READ_ROLES.includes(role);

    if (!hasRoleAccess) {
      // Check ACL
      if (!userId) throw new ForbiddenException('Acesso negado ao GED');
      const { data: aclEntry } = await this.supabase.admin
        .from('document_acl')
        .select('can_view')
        .eq('document_id', id)
        .eq('user_id', userId)
        .single();
      if (!aclEntry?.can_view) throw new ForbiddenException('Sem acesso a este documento');
    }

    const { data, error } = await this.supabase.admin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) throw new NotFoundException('Documento não encontrado');
    return data;
  }

  async getAcl(id: string, tenantId: string, role: string) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para gerenciar ACL');
    await this.findOne(id, tenantId, role);
    const { data, error } = await this.supabase.admin
      .from('document_acl')
      .select('id, user_id, can_view, can_download, can_edit, granted_by, created_at')
      .eq('document_id', id);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async grantAccess(
    id: string,
    targetUserId: string,
    canView: boolean,
    canDownload: boolean,
    canEdit: boolean,
    tenantId: string,
    grantedBy: string,
    role: string,
  ) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para conceder acesso');
    await this.findOne(id, tenantId, role);

    const { data, error } = await this.supabase.admin
      .from('document_acl')
      .upsert(
        {
          document_id: id,
          user_id: targetUserId,
          can_view: canView,
          can_download: canDownload,
          can_edit: canEdit,
          granted_by: grantedBy,
        },
        { onConflict: 'document_id,user_id' },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async revokeAccess(id: string, targetUserId: string, tenantId: string, role: string) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para revogar acesso');
    await this.findOne(id, tenantId, role);

    const { error } = await this.supabase.admin
      .from('document_acl')
      .delete()
      .eq('document_id', id)
      .eq('user_id', targetUserId);

    if (error) throw new Error(error.message);
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

  async downloadDocument(
    id: string,
    tenantId: string,
    userId: string,
    userName: string,
    role: string,
    ipAddress: string | null,
  ): Promise<
    | { type: 'redirect'; signedUrl: string }
    | { type: 'stream'; buffer: Buffer; mimeType: string; filename: string }
  > {
    const doc = await this.findOne(id, tenantId, role);
    if (!doc.storage_path) throw new BadRequestException('Documento sem arquivo associado');

    await this.logAccess(id, userId, 'download', ipAddress);

    const isPdf = (doc.mime_type as string | null) === 'application/pdf';

    if (!isPdf) {
      const { data, error } = await this.supabase.admin.storage
        .from(BUCKET)
        .createSignedUrl(doc.storage_path as string, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) throw new Error('Falha ao gerar URL de download');
      return { type: 'redirect', signedUrl: data.signedUrl };
    }

    // Download PDF and apply watermark
    const { data: blob, error: dlError } = await this.supabase.admin.storage
      .from(BUCKET)
      .download(doc.storage_path as string);

    if (dlError || !blob) throw new Error('Falha ao baixar o PDF');

    const srcBuffer = Buffer.from(await blob.arrayBuffer());
    const watermarked = await this.addWatermark(srcBuffer, userName);

    return {
      type: 'stream',
      buffer: watermarked,
      mimeType: 'application/pdf',
      filename: `${(doc.title as string).replace(/[^a-z0-9]/gi, '_')}.pdf`,
    };
  }

  private async addWatermark(pdfBytes: Buffer, userName: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const text = `Baixado por ${userName} — ${dateStr}`;
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - text.length * 3.5,
        y: height / 2,
        size: 24,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.3,
        rotate: degrees(45),
      });
    }

    const out = await pdfDoc.save();
    return Buffer.from(out);
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

  async getCategories(tenantId: string, role: string) {
    if (!READ_ROLES.includes(role)) throw new ForbiddenException('Acesso negado ao GED');
    const { data, error } = await this.supabase.admin
      .from('document_categories')
      .select('id, name, description, icon')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getVersions(id: string, tenantId: string, role: string) {
    await this.findOne(id, tenantId, role);
    const { data, error } = await this.supabase.admin
      .from('document_versions')
      .select('id, version, mime_type, size_bytes, uploaded_by, comment, created_at')
      .eq('document_id', id)
      .order('version', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async uploadNewVersion(
    id: string,
    file: Express.Multer.File,
    comment: string | undefined,
    tenantId: string,
    userId: string,
    role: string,
  ) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para versionar documentos');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
      throw new BadRequestException('Tipo de arquivo não permitido');
    if (file.size > MAX_SIZE_BYTES)
      throw new BadRequestException('Arquivo deve ser menor que 50 MB');

    const doc = await this.findOne(id, tenantId, role);
    const nextVersion = (doc.current_version as number) + 1;

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const objectPath = `${tenantId}/${userId}/${Date.now()}_v${nextVersion}.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(BUCKET)
      .upload(objectPath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    await this.supabase.admin.from('document_versions').insert({
      document_id: id,
      version: nextVersion,
      storage_path: objectPath,
      mime_type: file.mimetype,
      size_bytes: file.size,
      uploaded_by: userId,
      comment: comment ?? `Versão ${nextVersion}`,
    });

    const { data: updated, error: updateError } = await this.supabase.admin
      .from('documents')
      .update({
        storage_path: objectPath,
        mime_type: file.mimetype,
        size_bytes: file.size,
        current_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated)
      throw new Error(updateError?.message ?? 'Falha ao atualizar versão');
    await this.logAccess(id, userId, 'edit', null);
    return updated;
  }

  async restoreVersion(
    id: string,
    version: number,
    tenantId: string,
    userId: string,
    role: string,
  ) {
    if (!WRITE_ROLES.includes(role))
      throw new ForbiddenException('Sem permissão para restaurar versões');

    const doc = await this.findOne(id, tenantId, role);

    const { data: versionRow, error: vErr } = await this.supabase.admin
      .from('document_versions')
      .select('*')
      .eq('document_id', id)
      .eq('version', version)
      .single();

    if (vErr || !versionRow) throw new NotFoundException(`Versão ${version} não encontrada`);

    const nextVersion = (doc.current_version as number) + 1;

    await this.supabase.admin.from('document_versions').insert({
      document_id: id,
      version: nextVersion,
      storage_path: versionRow.storage_path,
      mime_type: versionRow.mime_type,
      size_bytes: versionRow.size_bytes,
      uploaded_by: userId,
      comment: `Restaurado da versão ${version}`,
    });

    const { data: updated, error: updateError } = await this.supabase.admin
      .from('documents')
      .update({
        storage_path: versionRow.storage_path,
        mime_type: versionRow.mime_type,
        size_bytes: versionRow.size_bytes,
        current_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updated) throw new Error('Falha ao restaurar versão');
    await this.logAccess(id, userId, 'restore_version', null);
    return updated;
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
