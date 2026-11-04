# ZAVRÉN Store — free starter launch

A Node.js/Express storefront with a private admin portal for product photo uploads, product names/prices/sizes, and customer order management.

## Included
- Customer storefront and Cash on Delivery checkout
- Private admin portal at `/admin`
- Add, edit and delete products; upload JPG/PNG/WEBP product photos (max 4 MB)
- Product catalogue and images stored in Supabase; product changes appear on the storefront
- Customer orders stored in Supabase; admin can update order status
- Server-side price and size validation; no WhatsApp ordering

## Deployment (free tiers)
1. Create a free Supabase project.
2. Open Supabase **SQL Editor** and run all of `supabase_schema.sql`. This creates the orders/products tables and public image bucket.
3. In Supabase Project Settings → API, copy the Project URL and the **service_role / secret key**. Never share this key or put it in frontend code.
4. Create a private GitHub repository and upload the contents of this folder (including `render.yaml`).
5. In Render, choose **New → Blueprint**, connect that repository, and create the free service.
6. In Render Environment, set `ADMIN_PASSWORD` to a strong unique password of at least 12 characters, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the values from step 3. Keep `ADMIN_USER=admin`; Render generates `SESSION_SECRET` automatically.
7. Wait for deployment. Your public website is `https://YOUR-SERVICE.onrender.com`; your private portal is `https://YOUR-SERVICE.onrender.com/admin`.
8. Sign in with username `admin` and the password you set. Open PRODUCTS, upload product images, enter names/prices/sizes, and save. Then test the customer checkout and confirm the order appears under ORDERS.

## Free-plan limitations
Render free web services sleep after 15 minutes without inbound traffic and can take about one minute to wake. Their local filesystem is temporary; this app stores catalogue, images and orders in Supabase instead. Supabase Free currently includes 500 MB database and 1 GB file storage and may pause projects after a week of low activity. Free tiers are suitable for testing/starting small, not a production uptime guarantee. Check provider terms and quotas.

## Before accepting real orders
- Deploy and complete a test order end-to-end.
- Add your actual products and prices in the portal; no sample products are preloaded.
- Add/verify shipping charges, courier arrangements, privacy/returns policy and customer support contact details.
- This build accepts Cash on Delivery only. It does not book couriers or send SMS/email notifications automatically.
- No custom domain is included; use the free `onrender.com` address initially.
