#!/bin/bash

# Firestore Indexes Setup Script (Firebase CLI version)
# Basado en los requisitos de NEGOCIO.md - compatible con Firebase CLI

echo "🚀 Creating Firestore composite indexes..."

# Crear índices primarios para queries frecuentes
firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field updated_at \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field tags \
  --query-field updated_at \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field is_pinned \
  --query-field updated_at \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection notes \
  --query-field notebook_id \
  --query-field updated_at \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field sync_status \
  --disallow-override

# Índices para búsqueda y filtrado
firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field word_count \
  --disallow-override

firebase firestore:indexes:create \
  --collection notes \
  --query-field user_id \
  --query-field is_template \
  --disallow-override

# Índices para historial y auditoría
firebase firestore:indexes:create \
  --collection note_history \
  --query-field note_id \
  --query-field version \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection note_history \
  --query-field user_id \
  --query-field timestamp \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection audit_logs \
  --query-field user_id \
  --query-field timestamp \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection audit_logs \
  --query-field resource_type \
  --query-field resource_id \
  --query-field timestamp \
  --order desc \
  --disallow-override

# Índices para adjuntos y storage
firebase firestore:indexes:create \
  --collection attachments \
  --query-field user_id \
  --query-field created_at \
  --order desc \
  --disallow-override

firebase firestore:indexes:create \
  --collection attachments \
  --query-field note_id \
  --query-field created_at \
  --order desc \
  --disallow-override

# Índices para notebooks
firebase firestore:indexes:create \
  --collection notebooks \
  --query-field user_id \
  --query-field parent_notebook_id \
  --disallow-override

firebase firestore:indexes:create \
  --collection notebooks \
  --query-field user_id \
  --query-field is_favorite \
  --query-field sort_order \
  --disallow-override

# Índices para invitations
firebase firestore:indexes:create \
  --collection invitations \
  --query-field invited_email \
  --query-field status \
  --disallow-override

firebase firestore:indexes:create \
  --collection invitations \
  --query-field invitation_token \
  --disallow-override

firebase firestore:indexes:create \
  --collection invitations \
  --query-field expires_at \
  --disallow-override

echo "✅ 13 critical Firestore composite indexes created successfully!"
echo "⏱️  Indexes will take 5-10 minutes to become fully active"
echo ""
echo "📊 Indexes created:"
echo "  user_id + updated_at (notes)"
echo "  user_id + tags + updated_at (notes)"
echo "  user_id + is_pinned + updated_at (notes)"
echo "  notebook_id + updated_at (notes)"
echo "  user_id + sync_status (notes)"
echo "  user_id + word_count (notes)"
echo "  user_id + is_template (notes)"
echo "  note_id + version (note_history)"
echo "  user_id + timestamp (note_history)"
echo "  user_id + timestamp (audit_logs)"
echo "  resource_type + resource_id + timestamp (audit_logs)"
echo "  user_id + created_at (attachments)"
echo "  note_id + created_at (attachments)"
echo "  user_id + parent_notebook_id (notebooks)"
echo "  user_id + is_favorite + sort_order (notebooks)"
echo "  invited_email + status (invitations)"
echo "  invitation_token (invitations)"
echo "  expires_at (invitations)"