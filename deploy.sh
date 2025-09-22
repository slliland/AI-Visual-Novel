#!/bin/bash

# Visual Novel Deployment Script for Vercel
echo "🎭 Deploying Visual Novel to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project locally to check for errors
echo "🔨 Building project locally..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "📝 Please run 'vercel login' first if you haven't already"
vercel --prod --yes

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set up Vercel Postgres database (see DEPLOYMENT.md)"
echo "2. Run the schema.sql in your database"
echo "3. Connect the database to your project"
echo "4. Test your deployment!"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT.md"
