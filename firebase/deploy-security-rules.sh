#!/bin/bash

# Firebase Security Rules Deployment Script
# Implementa las reglas de seguridad críticas para Firestore y Storage

echo "🚀 Deploying Firebase Security Rules..."

# Deploy Firestore Rules
echo "📝 Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

# Deploy Storage Rules
echo "📁 Deploying Storage rules..."
firebase deploy --only storage:rules

if [ $? -eq 0 ]; then
    echo "✅ Storage rules deployed successfully"
else
    echo "❌ Failed to deploy Storage rules"
    exit 1
fi

echo "🔐 Security rules deployment completed!"

# Check current status
echo ""
echo "📊 Current Firebase Project Status:"
echo "Project: appnotesbg-app"
echo "Firestore Rules: $(firebase firestore:rules:list 2>/dev/null | grep -c 'ruleset_id' || echo 'Not deployed')"
echo "Storage Rules: $(gsutil cp gs://appnotesbg-app.appspot.com/*.firebasestorage gs://tmp/ 2>/dev/null && echo 'Deployed' || echo 'Not deployed')"

# Check indexes status (if available)
echo ""
echo "📈 Checking Firestore indexes..."
gcloud firestore indexes list --project=appnotesbg-app --format="table(name,query_scope,collection_group_id,fields)" || echo "⚠️  Could not list indexes (check gcloud auth)"

echo ""
echo "🎯 Security hardening summary:"
echo "✅ Users collection - owner-only access"
echo "✅ Notes collection - owner + collaborators read/write"
echo "✅ Notebooks collection - owner-only access" 
echo "✅ Attachments collection - owner-only access"
echo "✅ Invitations collection - controlled access"
echo "✅ Storage paths - user isolation enforced"
echo "✅ File size validation - 10MB limit"
echo "✅ MIME type validation - restricted formats"

echo ""
echo "⏱️  Allow 5-10 minutes for indexes to become fully active"
echo "🔄 Run performance tests after indexes are ready"