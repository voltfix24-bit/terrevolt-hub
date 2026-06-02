
CREATE POLICY "Public read kb-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'kb-documents');

CREATE POLICY "Public insert kb-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kb-documents');

CREATE POLICY "Public update kb-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'kb-documents')
  WITH CHECK (bucket_id = 'kb-documents');

CREATE POLICY "Public delete kb-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'kb-documents');
