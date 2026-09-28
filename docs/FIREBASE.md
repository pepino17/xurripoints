# Conectar Firebase (5 minutos, gratis)

Sin esto, la app solo funciona en **modo demo** (un móvil). Con esto, cada uno la tiene en su móvil
y se sincroniza al instante. El plan gratuito (**Spark**) sobra para una pareja.

## 1. Crear el proyecto
1. Entra en **https://console.firebase.google.com** con tu cuenta de Google.
2. **Crear un proyecto** → nombre: `xurripoints` → Google Analytics: **desactivado** → **Crear**.

## 2. Activar las cuentas (email + contraseña)
1. Menú izquierdo → **Compilación → Authentication** → **Comenzar**.
2. Pestaña **Método de acceso** → **Correo electrónico/contraseña** → activar el primer interruptor → **Guardar**.

## 3. Crear la base de datos
1. Menú izquierdo → **Compilación → Firestore Database** → **Crear base de datos**.
2. Ubicación: **`europe-southwest1` (Madrid)** o `eur3 (Europa)` → **Siguiente**.
3. **Modo de producción** → **Crear**.

## 4. Pegar las reglas de seguridad
1. En Firestore → pestaña **Reglas**.
2. Borra todo lo que hay y pega el contenido de **`firestore.rules`** (está en la raíz del proyecto).
3. **Publicar**.

> Las reglas hacen que solo los dos miembros de cada pareja puedan ver sus datos, y que nadie pueda
> aprobarse sus propios puntos.

## 5. Sacar la configuración
1. Arriba a la izquierda, ⚙️ → **Configuración del proyecto** → pestaña **General**.
2. Abajo, en **Tus apps**, pulsa el icono web **`</>`**.
3. Apodo: `xurripoints-web` (sin marcar Hosting) → **Registrar app**.
4. Verás un bloque `const firebaseConfig = { apiKey: "...", ... }`. **Cópialo**.

## 6. Pegarlo en la app
- **Fácil:** pégaselo a Claude en el chat y él lo pone, hace commit y push, y sale un APK nuevo.
- **A mano:** sustituye los valores de `app/firebase-config.js` → commit → `git push origin main`.

Estos valores **no son secretos** (identifican el proyecto). La seguridad la ponen las reglas del paso 4.

## Después
1. Instala el APK nuevo en los **dos** móviles.
2. Cada uno: **Crear cuenta** (email + contraseña).
3. Uno pulsa **Crear nuestra pareja** → le sale un **código de 6 letras** → se lo envía al otro.
4. El otro pone el código en **Tengo un código → Unirme**. ¡Listo! 💞

## Si algo falla
| Mensaje en la app | Qué pasa |
|---|---|
| "Falta activar Email/Contraseña" | Paso 2 sin hacer. |
| "Falta crear la base de datos" | Paso 3 sin hacer. |
| "Sin permiso. ¿Están publicadas las reglas?" | Paso 4 sin hacer (o reglas antiguas). |
| "Sin conexión" | Sin internet. Lo que apuntes se guarda y se sube al volver la red. |
