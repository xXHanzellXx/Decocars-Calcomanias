# CalcoDesign — Catálogo con panel administrativo

Proyecto completo de catálogo de calcomanías con **HTML/CSS/JavaScript + Node.js/Express + MongoDB**.

## Qué está funcionando

- Catálogo público conectado directamente a MongoDB.
- Los productos creados desde el panel aparecen en la página principal.
- Crear, editar y eliminar productos.
- Activar/desactivar productos sin borrarlos.
- Productos destacados.
- Búsqueda, filtros, ordenamiento y paginación.
- Categorías guardadas en MongoDB.
- Crear, editar y eliminar categorías.
- Imagen propia para cada categoría.
- Imagen propia para cada producto desde el panel mediante selector de archivos.
- Las imágenes se comprimen en el navegador antes de guardarse.
- Login administrativo con contraseña `bcrypt`.
- Sesión con JWT almacenada en cookie `HttpOnly`.
- El panel valida la sesión contra el backend antes de mostrarse.
- Las operaciones de escritura están protegidas en el backend.
- Límite de intentos de inicio de sesión.
- Cabeceras básicas de seguridad y CORS configurable.
- No se utilizan productos mock como sustituto de la base de datos.

## Estructura

```text
Decocars-Calcomanias-main/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Category.js
│   │   ├── Product.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── categories.js
│   │   └── products.js
│   ├── .env.example
│   ├── createAdmin.js
│   ├── package.json
│   ├── seed.js
│   └── server.js
└── frontend/
    ├── css/
    ├── js/
    │   ├── admin.js
    │   ├── api.js
    │   ├── app.js
    │   ├── config.js
    │   └── image.js
    ├── admin.html
    └── index.html
```

## Instalación

Requiere Node.js 18+ y una base de datos MongoDB Atlas o MongoDB local.

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Crear `.env`

Copie `.env.example` como `.env`.

```env
MONGO_URI=mongodb+srv://USUARIO:CONTRASENA@cluster.mongodb.net/decocars
JWT_SECRET=UNA_CLAVE_ALEATORIA_DE_AL_MENOS_32_CARACTERES
JWT_EXPIRES_IN=8h
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
ADMIN_EMAIL=admin@calcodesign.cr
ADMIN_PASSWORD=CAMBIE_ESTA_CONTRASENA
ADMIN_NAME=Administrador
```

**No publique `.env` ni su contraseña de administrador.**

### 3. Crear el administrador

```bash
npm run admin
```

La contraseña se convierte en un hash `bcrypt` y no se guarda en texto plano.

Si cambia la contraseña en `.env`, vuelva a ejecutar `npm run admin`.

### 4. Opcional: insertar productos de ejemplo

```bash
npm run seed
```

Este comando **no borra los productos existentes**.

### 5. Ejecutar

```bash
npm start
```

Abra:

```text
http://localhost:5000
```

El mismo servidor sirve la página principal y `admin.html`.

## Seguridad del administrador

El flujo es:

```text
/index.html
    ↓
Login
    ↓
POST /api/auth/login
    ↓
bcrypt compara contraseña
    ↓
JWT firmado
    ↓
cookie HttpOnly
    ↓
/admin.html
    ↓
GET /api/auth/me
    ↓
Panel visible
```

Si alguien escribe directamente `admin.html` sin una sesión válida, el contenido del panel permanece oculto y el navegador es enviado al login.

Además, aunque alguien intente saltarse el frontend y llamar directamente a la API, estas operaciones requieren autenticación:

```text
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

La consulta pública del catálogo no requiere login.

## Imágenes

Ya no necesita editar JavaScript para colocar imágenes.

### Imágenes de productos

En el panel:

1. Entre a **Agregar calcomanía**.
2. Pulse **Imagen del producto**.
3. Seleccione una imagen de su computadora.
4. Guarde el producto.

La imagen se comprime en el navegador y se guarda en MongoDB como una imagen `data:`.

### Imágenes de categorías

En el panel:

1. Vaya a **Agregar categoría**.
2. Escriba el nombre.
3. Seleccione **Imagen de la categoría**.
4. Guarde.

La imagen aparecerá automáticamente en la sección **Explora por categoría** de la página principal.

El límite de seguridad para una imagen almacenada es aproximadamente 1 MB después de la compresión.

## Si frontend y backend están en dominios separados

En `frontend/js/config.js` coloque la URL del backend:

```js
window.APP_CONFIG = {
  API_BASE: "https://SU-BACKEND.com/api"
};
```

En el `.env` del backend coloque el dominio exacto del frontend:

```env
FRONTEND_ORIGIN=https://SU-FRONTEND.com
COOKIE_SAMESITE=none
COOKIE_SECURE=true
NODE_ENV=production
```

Esto permite que la cookie de autenticación se utilice de forma segura entre dominios.

## MongoDB

El backend crea automáticamente estas categorías iniciales si todavía no existen:

- Naturaleza
- Astral
- Retro
- Minimal
- Animales
- Urbano
- Arte
- Especial

Los productos se almacenan en la colección `products` y las categorías en `categories`.

## API pública

```text
GET /api/health
GET /api/products
GET /api/products/:id
GET /api/products/featured
GET /api/categories
```

## API administrativa

Requiere sesión JWT válida:

```text
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/categories/admin
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

## Importante

No abra `frontend/index.html` haciendo doble clic si quiere usar MongoDB. Ejecute el backend y entre por `http://localhost:5000` para que frontend, cookies y API funcionen juntos correctamente.
