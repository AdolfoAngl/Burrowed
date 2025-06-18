# Burrowed
Sistema para eficientizar el préstamo de material eléctrico y de laboratorios
¿Cómo funciona el proyecto?
Este proyecto es una aplicación web para la gestión de laboratorios, materiales, eventos y reservaciones. Permite a usuarios (alumnos, profesores, administradores) interactuar con el sistema para reservar laboratorios, solicitar materiales, registrar eventos y gestionar inventarios.

Flujo general:
Los usuarios acceden a la aplicación web mediante un navegador.
Dependiendo del tipo de usuario (alumno, profesor, administrador), pueden realizar diferentes acciones: reservar laboratorios, solicitar materiales, registrar eventos, consultar historial, etc.
La aplicación maneja la autenticación y autorización de usuarios.
Toda la información se almacena y consulta desde una base de datos relacional (probablemente MySQL o similar, según el archivo db.js).

Tecnologías utilizadas
Node.js: Entorno de ejecución para JavaScript en el servidor.
Express.js: Framework para crear el servidor web y definir rutas.
Pug: Motor de plantillas para renderizar vistas HTML dinámicas.
MySQL (u otro SQL): Base de datos relacional para almacenar la información (según los archivos .sql y la configuración en db.js).
Bootstrap: Framework CSS para estilos y componentes visuales.
JavaScript: Lenguaje principal tanto en el backend como en el frontend.
Módulos propios: Controladores, modelos y rutas organizados en carpetas.


Distribución del proyecto
index.js: Punto de entrada principal de la aplicación, donde se configura y arranca el servidor Express.
config/: Archivos de configuración, como la conexión a la base de datos (db.js) y la gestión de sesiones (session.js).
controllers/: Lógica de negocio y controladores para manejar las peticiones de los usuarios (por ejemplo, appController.js, registroController.js).
models/: Modelos que representan las entidades principales del sistema (por ejemplo, Evento.js, Laboratorio.js, Material.js, etc.).
routes/: Definición de rutas de la aplicación, agrupadas en archivos como approutes.js.
public/: Archivos estáticos accesibles desde el navegador (CSS, JS, imágenes, PDFs, etc.).
views/: Vistas Pug que definen la interfaz de usuario para cada página de la aplicación.
archivos .sql: Scripts para crear o migrar la base de datos.
