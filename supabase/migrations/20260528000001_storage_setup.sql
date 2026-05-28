-- =============================================================================
-- Migration: 20260528000001_storage_setup
-- Task: 1.2 — Configurar Supabase Storage bucket ged-documents com RLS
-- =============================================================================

-- Criar bucket ged-documents (privado)
-- Tipos aceitos: PDF, Word, Excel, imagens, texto
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ged-documents',
  'ged-documents',
  false,                -- bucket privado — sem acesso público direto
  52428800,             -- 50 MB em bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies para storage.objects no bucket ged-documents
-- =============================================================================

-- Policy 1: Usuários autenticados podem fazer upload de documentos
CREATE POLICY "ged_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ged-documents'
  AND auth.uid() IS NOT NULL
);

-- Policy 2: Usuários podem ler documentos próprios.
--           Roles com acesso amplo (compliance, director, manager, super_admin)
--           podem ler todos os documentos — refinado em 5.1 com ACL por departamento.
CREATE POLICY "ged_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND (
    -- owner sempre pode ler seus próprios arquivos
    owner = auth.uid()
    OR
    -- roles com acesso amplo (será substituído por ACL de departamento na task 5.1)
    EXISTS (
      SELECT 1
      FROM auth.users au
      JOIN public.users pu ON pu.id = au.id
      WHERE au.id = auth.uid()
        AND pu.role IN ('compliance', 'director', 'manager', 'super_admin')
    )
  )
);

-- Policy 3: Somente owner ou super_admin podem deletar documentos
CREATE POLICY "ged_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND (
    owner = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  )
);

-- Policy 4: Owner pode atualizar metadados do documento
CREATE POLICY "ged_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ged-documents'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'ged-documents'
  AND owner = auth.uid()
);
