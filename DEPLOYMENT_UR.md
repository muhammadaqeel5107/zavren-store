# ZAVRÉN ko free live karne ka tareeqa

### 1) Supabase par database banayein
- https://supabase.com par free account banayein aur New Project karein.
- Project ke SQL Editor mein `supabase_schema.sql` ki poori file paste karke Run karein.
- Project Settings → API se Project URL aur service_role/secret key copy karein. **Secret key kisi ko na bhejein aur website ke code mein public na karein.**

### 2) GitHub par website upload karein
- https://github.com par account banayein.
- New **Private** repository banayein.
- Is package ke folder ke tamam files upload karein. `render.yaml` root mein hona chahiye.

### 3) Render par free website deploy karein
- https://render.com par GitHub se sign up karein.
- Dashboard → New → Blueprint par ja kar apni repository connect karein.
- Render service banate waqt environment values dein: `ADMIN_PASSWORD` (kam az kam 12 characters ka strong password), `SUPABASE_URL` aur `SUPABASE_SERVICE_ROLE_KEY`.
- `SESSION_SECRET` Render khud generate karega.
- Deploy complete hone par Render aapko public website ka link dega.

### 4) Aapka product/order portal
- Portal link: apni website ke link ke aakhir mein `/admin` lagayein.
- Username: `admin`
- Password: wohi jo aap ne Render mein `ADMIN_PASSWORD` set kiya.
- PRODUCTS tab mein photo upload karein, product name, price, description aur sizes likh kar SAVE PRODUCT karein. Product website par nazar aayega.
- ORDERS tab mein customer ke orders, phone, address, items aur total dekhein. Status New se Confirmed/Dispatched/Delivered/Cancelled kar sakte hain.

### Zaroori baat
Abhi koi live link nahi bana, kyun ke Supabase, GitHub aur Render accounts ko aapki taraf se create/connect karna zaroori hai. Pehle ek test order karein; jab portal mein order nazar aaye tab customers ko link share karein. Free Render service 15 minute idle rehne par sleep kar sakti hai aur next visit par lagbhag 1 minute le sakti hai. Supabase free project kam activity par ek haftay baad pause ho sakta hai.
