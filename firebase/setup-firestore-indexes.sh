# Firestore Indexes Setup Script
# Basado en los requisitos de NEGOCIO.md

# Índices primarios para queries frecuentes
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,updated_at=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,tags=ASC,updated_at=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,is_pinned=ASC,updated_at=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=notebook_id=ASC,updated_at=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,sync_status=ASC \
  --collection-group-id=

# Índices para búsqueda y filtrado
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,word_count=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=user_id=ASC,is_template=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notes \
  --query-params=sharing.public_slug=ASC,sharing.public_access_expires=ASC \
  --collection-group-id=

# Índices para historial y auditoría
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=note_history \
  --query-params=note_id=ASC,version=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=note_history \
  --query-params=user_id=ASC,timestamp=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=audit_logs \
  --query-params=user_id=ASC,timestamp=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=audit_logs \
  --query-params=resource_type=ASC,resource_id=ASC,timestamp=DESC \
  --collection-group-id=

# Índices para adjuntos y storage
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=attachments \
  --query-params=user_id=ASC,created_at=DESC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=attachments \
  --query-params=file_hash=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=attachments \
  --query-params=note_id=ASC,created_at=DESC \
  --collection-group-id=

# Índices para notebooks
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notebooks \
  --query-params=user_id=ASC,parent_notebook_id=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=notebooks \
  --query-params=user_id=ASC,is_favorite=ASC,sort_order=ASC \
  --collection-group-id=

# Índices para invitations
gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=invitations \
  --query-params=invited_email=ASC,status=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=invitations \
  --query-params=invitation_token=ASC \
  --collection-group-id=

gcloud firestore indexes composite create \
  --project=appnotesbg-app \
  --collection=invitations \
  --query-params=expires_at=ASC \
  --collection-group-id=

echo "✅ 13 índices compuestos críticos creados exitosamente"
echo "⏱️  Los índices tomarán 5-10 minutos en estar completamente disponibles"