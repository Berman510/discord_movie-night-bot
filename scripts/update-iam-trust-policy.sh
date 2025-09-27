#!/bin/bash
# Update IAM role trust policy to include v1.16.3 branch explicitly

set -e

ROLE_NAME="watchparty-dashboard-github-actions-apply"
AWS_REGION="us-west-2"

echo "🔐 Updating IAM role trust policy for GitHub Actions"
echo "Role: $ROLE_NAME"
echo ""

# Create updated trust policy
cat > /tmp/trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::321447295215:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": [
                        "repo:Berman510/watchparty-dashboard:*",
                        "repo:Berman510/discord_movie-night-bot:*"
                    ]
                }
            }
        }
    ]
}
EOF

echo "📝 New trust policy:"
cat /tmp/trust-policy.json
echo ""

echo "🔄 Updating IAM role trust policy..."
aws iam update-assume-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-document file:///tmp/trust-policy.json \
    --region "$AWS_REGION"

echo "✅ Trust policy updated successfully!"
echo ""

echo "🔍 Verifying updated policy..."
aws iam get-role \
    --role-name "$ROLE_NAME" \
    --region "$AWS_REGION" \
    --query 'Role.AssumeRolePolicyDocument.Statement[0].Condition.StringLike."token.actions.githubusercontent.com:sub"' \
    --output table

echo ""
echo "✅ IAM role trust policy update completed!"

# Cleanup
rm -f /tmp/trust-policy.json
