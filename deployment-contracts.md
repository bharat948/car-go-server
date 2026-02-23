# Deployment Contracts

This document outlines the hard requirements and configurations for deploying the Package Delivery backend to AWS EC2 and the frontend to Vercel.

## 1. Backend Connectivity
- **Stable Base URL**: The backend must have a static IP or a domain name assigned (e.g., `https://api.package-delivery.com`).
- **Frontend Variable**: This URL must be set as `REACT_APP_API_URL` in Vercel's environment variables.

## 2. EC2 Network Security
- **Security Group Rules**:
    - **HTTPS (Port 443)**: MUST be whitelisted for inbound traffic from the internet (0.0.0.0/0).
    - **HTTP (Port 80)**: Recommended to allow for redirection to HTTPS.
    - **App Port (4000)**: Should NOT be exposed directly unless behind a load balancer. If direct, whitelist only required origins or HTTPS.
    - **SSH (Port 22)**: Should be restricted to your specific IP only.

## 3. CORS Configuration
- **Production Origin**: The Express application is configured to look for `FRONTEND_URL` in environment variables.
- **Contract**: `FRONTEND_URL` must match the exact production domain provided by Vercel (e.g., `https://package-delivery-frontend.vercel.app`). No wildcards are allowed in production.

## 4. Secret Management
- **Environment Variables**: All sensitive data MUST be provided via OS environment variables on the EC2 instance or via AWS Secrets Manager.
- **Required Secrets**:
    - `JWT_SECRET`: A long, random string for token signing.
    - `OPENCAGE_API_KEY`: Your OpenCage Geocoding API key.
    - `NODE_ENV`: Set to `production` to enable secure cookies.
    - `FRONTEND_URL`: The Vercel production domain.
- **Repository Safety**: Never commit `.env` or any hardcoded secrets to the repository.

## 5. Deployment Checklist
- [ ] Allocate Elastic IP on AWS.
- [ ] Configure Security Group for HTTPS.
- [ ] Setup SSL certificate (e.g., Let's Encrypt / Certbot).
- [ ] Populate environment variables on the server.
- [ ] Deploy frontend to Vercel with correct `REACT_APP_API_URL`.
