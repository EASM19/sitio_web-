# Requirements Specification --- Sistema Web de Pedidos para Restaurante

**Versión:** 1.0  
**Estado:** Draft / Base para desarrollo  
**Tipo:** Sitio web responsive para restaurante o local de comida  
**Fuente:** Entrevistas con clientes y clasificación MoSCoW  
**Objetivo:** Servir como fuente de verdad funcional para OpenCode
durante el diseño, desarrollo y pruebas.

\---

# 1\. Propósito

Construir un sistema web que permita al restaurante:

* ofrecer un menú digital mediante código QR;
* permitir que los clientes consulten el menú desde su celular;
* permitir realizar pedidos desde el celular;
* concentrar los pedidos en un solo sistema;
* organizar pedidos por estado;
* reducir confusiones y errores;
* disminuir el tiempo utilizado en llamadas y WhatsApp;
* preparar el producto para futuras estadísticas y funciones
administrativas.

El problema principal detectado es que los pedidos llegan por diferentes
medios y, cuando se acumulan, pueden producirse confusiones, pérdida de
tiempo y errores.

La primera versión debe resolver principalmente la organización de
pedidos y no intentar construir todas las funciones posibles del
restaurante.

\---

# 2\. Información obtenida de las entrevistas

Los clientes indicaron:

* Los pedidos se reciben principalmente por los meseros.
* Para llevar reciben pedidos por teléfono y WhatsApp.
* También existen pedidos a domicilio.
* Cuando se juntan varios pedidos pueden existir confusiones.
* Las llamadas y WhatsApp quitan tiempo cuando hay muchos clientes.
* Han ocurrido errores en pedidos.
* Actualmente utilizan un menú impreso.
* Sí les interesa un menú mediante código QR.
* El cliente podría escanear el QR desde la mesa y hacer su pedido.
* Quieren fotos, precios, ingredientes y disponibilidad.
* Quieren concentrar todos los pedidos en un solo sistema.
* Quieren estados: recibido, preparando, listo y entregado.
* Les interesa recibir una notificación cuando entra un pedido.
* Quieren poder retirar productos agotados.
* Les interesa saber cuáles son los platillos más vendidos.
* El sistema debe ahorrar tiempo y evitar errores.
* Prefieren pagar una mensualidad en lugar de una comisión.
* Precio aproximado considerado: $200 a $400 MXN mensuales,
dependiendo de las funciones.

\---

# 3\. Problema y objetivo

## Problema

Los pedidos actualmente se reciben mediante distintos canales. Al
aumentar la cantidad de clientes pueden producirse confusiones, errores
y pérdida de tiempo.

## Objetivo

Centralizar los pedidos mediante un sistema web sencillo.

El objetivo inicial es:

**ahorrar tiempo + centralizar pedidos + reducir confusiones + reducir
errores.**

\---

# 4\. Clasificación MoSCoW

## 4.1 MUST HAVE

Son imprescindibles para el MVP.

### REQ-MUST-001 --- Menú digital mediante QR

El sistema DEBE permitir acceder al menú mediante un código QR.

El cliente debe poder:

* escanear el QR;
* abrir el menú desde su celular;
* consultar categorías;
* consultar productos;
* consultar precios;
* consultar ingredientes;
* consultar disponibilidad;
* seleccionar productos.

No debe instalar una aplicación.

### REQ-MUST-002 --- Menú responsive

El menú DEBE funcionar correctamente en celular, tablet y computadora.

La prioridad del menú público es:

**Celular > Tablet > Computadora**

### REQ-MUST-003 --- Productos

Cada producto debe soportar:

* nombre;
* descripción;
* precio;
* ingredientes;
* imagen;
* categoría;
* disponibilidad.

Las categorías deben poder cambiarse.

### REQ-MUST-004 --- Carrito

El cliente debe poder:

1. seleccionar productos;
2. indicar cantidad;
3. agregar productos;
4. modificar cantidades;
5. eliminar productos;
6. revisar el total;
7. confirmar el pedido.

### REQ-MUST-005 --- Identificación de mesa

El sistema debe poder identificar la mesa desde la cual se escaneó el
QR.

Ejemplo:

`QR Mesa 05 → Pedido #1025 → Mesa 05`

La arquitectura debe permitir posteriormente pedidos para llevar y
domicilio.

### REQ-MUST-006 --- Panel administrativo de pedidos

Debe existir un panel para el personal del restaurante.

Cada pedido debe mostrar como mínimo:

* número de pedido;
* hora;
* mesa u origen;
* productos;
* cantidades;
* observaciones;
* total;
* estado.

### REQ-MUST-007 --- Estados

Los estados iniciales son:

1. `RECIBIDO`
2. `PREPARANDO`
3. `LISTO`
4. `ENTREGADO`

El personal debe poder cambiar el estado.

### REQ-MUST-008 --- Organización visual

El panel debe permitir distinguir rápidamente pedidos recibidos, en
preparación, listos y entregados.

La interfaz debe priorizar rapidez y claridad.

### REQ-MUST-009 --- Reducción de errores

El sistema debe mostrar claramente número de pedido, mesa, productos,
cantidades, observaciones y total.

\---

## 4.2 SHOULD HAVE

Son importantes, pero pueden incorporarse después del núcleo del MVP.

### REQ-SHOULD-001 --- Notificación de nuevo pedido

El panel debería mostrar una alerta visual cuando llegue un pedido.

### REQ-SHOULD-002 --- Disponibilidad

El administrador debería poder marcar productos como:

* Disponible
* Agotado

Un producto agotado no debería poder agregarse a un pedido nuevo.

### REQ-SHOULD-003 --- Pedidos para llevar

Debe poder existir un tipo de pedido:

`PARA\_LLEVAR`

y aparecer en el mismo sistema central.

### REQ-SHOULD-004 --- Pedidos a domicilio

La arquitectura debería permitir guardar:

* nombre;
* teléfono;
* dirección;
* productos;
* total;
* estado.

Si aumenta demasiado la complejidad, esta función queda para una fase
posterior.

### REQ-SHOULD-005 --- Administración del menú

El administrador debería poder crear, editar, desactivar y administrar:

* productos;
* categorías;
* precios;
* ingredientes;
* imágenes;
* disponibilidad.

\---

## 4.3 COULD HAVE

Son funciones deseables para futuras versiones.

### REQ-COULD-001 --- Estadísticas

Podría mostrar:

* pedidos del día;
* ventas del día;
* ventas de la semana;
* ventas del mes;
* productos más vendidos.

### REQ-COULD-002 --- Productos más vendidos

El sistema podría ordenar los productos por cantidad de ventas.

### REQ-COULD-003 --- Historial

Podría existir historial y filtros por fecha, estado, mesa y tipo de
pedido.

### REQ-COULD-004 --- Funciones comerciales

Posteriormente podrían agregarse:

* promociones;
* productos destacados;
* combos;
* recomendaciones.

\---

## 4.4 WON'T HAVE

Quedan fuera de la primera versión.

### REQ-WONT-001 --- Pagos en línea

No implementar inicialmente:

* tarjetas;
* Mercado Pago;
* Stripe;
* PayPal;
* pagos QR;
* cobro automático.

### REQ-WONT-002 --- Programa de puntos

No implementar inicialmente:

* puntos;
* niveles;
* recompensas;
* membresías.

### REQ-WONT-003 --- Marketing avanzado

No implementar inicialmente:

* campañas publicitarias;
* cupones complejos;
* campañas automáticas por WhatsApp;
* segmentación avanzada.

### REQ-WONT-004 --- Aplicación móvil nativa

La primera versión será un sitio web responsive. No se publicará
inicialmente como aplicación de Play Store o App Store.

\---

# 5\. Definición del MVP

El MVP consistirá ÚNICAMENTE en:

## Función A --- Menú digital mediante código QR

El cliente escaneará el QR desde la mesa, consultará el menú y
seleccionará los productos disponibles.

## Función B --- Sistema centralizado de pedidos

El pedido enviado por el cliente aparecerá en un panel administrativo
donde el personal podrá verlo y cambiar su estado.

Estados:

`Recibido → Preparando → Listo → Entregado`

## Justificación

Se mandan a `Won't Have` funciones como pagos en línea, puntos y
marketing porque las entrevistas mostraron que la necesidad principal es
ahorrar tiempo, evitar confusiones y reducir errores al recibir y
organizar pedidos.

Primero se debe validar que el sistema resuelva ese problema antes de
agregar funciones secundarias.

\---

# 6\. Flujo principal del cliente

``` text
Escanear QR
    ↓
Abrir menú
    ↓
Consultar productos
    ↓
Seleccionar productos
    ↓
Agregar al carrito
    ↓
Revisar pedido
    ↓
Confirmar
    ↓
Sistema registra pedido
    ↓
Pedido aparece en administración
```

\---

# 7\. Flujo del restaurante

``` text
Nuevo pedido
    ↓
RECIBIDO
    ↓
PREPARANDO
    ↓
LISTO
    ↓
ENTREGADO
```

El personal debe poder cambiar el estado desde el panel.

\---

# 8\. Pantallas requeridas

## REQ-UI-001 --- Menú público

Ruta conceptual:

`/menu/:restaurantId`

Debe mostrar:

* nombre del restaurante;
* logo;
* categorías;
* productos;
* fotografías;
* precios;
* ingredientes;
* disponibilidad;
* carrito.

## REQ-UI-002 --- Carrito

Debe mostrar:

* productos;
* cantidades;
* precio individual;
* subtotal;
* total;
* botón para confirmar.

## REQ-UI-003 --- Confirmación

Después de enviar:

* número de pedido;
* mesa;
* productos;
* total;
* estado.

Ejemplo:

`Pedido #1025 — Mesa 05 — Estado: Recibido`

## REQ-UI-004 --- Panel administrativo

Debe mostrar pedidos organizados por estado.

Se recomienda un tablero tipo columnas:

`Recibido | Preparando | Listo | Entregado`

## REQ-UI-005 --- Gestión de productos

Debe permitir administrar:

* nombre;
* descripción;
* precio;
* ingredientes;
* imagen;
* categoría;
* disponibilidad.

\---

# 9\. Diseño visual

El sitio debe verse como un producto comercial real.

Principios:

* moderno;
* limpio;
* profesional;
* responsive;
* fácil de leer;
* botones claros;
* buena separación entre productos;
* estados de pedidos fáciles de identificar;
* evitar saturación;
* evitar animaciones innecesarias.

La experiencia móvil del menú es prioritaria.

\---

# 10\. Arquitectura

Separar como mínimo:

``` text
Frontend
   ↓
API / lógica de aplicación
   ↓
Base de datos
```

OpenCode puede elegir el stack, pero antes de una decisión
arquitectónica importante debe explicar brevemente:

* tecnología frontend;
* backend;
* base de datos;
* almacenamiento de imágenes;
* despliegue.

No introducir tecnologías innecesarias.

\---

# 11\. Datos principales

## Restaurante

``` text
id
nombre
logo
dirección
teléfono
estado
```

## Categoría

``` text
id
restaurant\_id
nombre
orden
estado
```

## Producto

``` text
id
restaurant\_id
category\_id
nombre
descripción
precio
ingredientes
imagen
disponibilidad
estado
```

## Mesa

``` text
id
restaurant\_id
numero
codigo\_qr
estado
```

## Pedido

``` text
id
restaurant\_id
numero\_pedido
mesa\_id
tipo
estado
total
fecha\_creacion
```

## Detalle del pedido

``` text
id
pedido\_id
producto\_id
cantidad
precio
observaciones
```

La estructura puede modificarse si OpenCode encuentra una solución
mejor, pero debe documentar el motivo.

\---

# 12\. Reglas de negocio

### REQ-BUSINESS-001

Un producto agotado no puede agregarse a un pedido nuevo.

### REQ-BUSINESS-002

El precio utilizado debe guardarse en el detalle del pedido para
conservar el precio histórico.

### REQ-BUSINESS-003

Cada pedido pertenece a un restaurante.

### REQ-BUSINESS-004

Cada mesa pertenece a un restaurante.

### REQ-BUSINESS-005

Cada producto pertenece a un restaurante.

### REQ-BUSINESS-006

Un restaurante no puede consultar ni modificar información de otro
restaurante.

### REQ-BUSINESS-007

El total debe calcularse usando productos y cantidades registradas.

### REQ-BUSINESS-008

El cliente no puede modificar directamente el estado del pedido.

### REQ-BUSINESS-009

El sistema debe generar un identificador único de pedido.

\---

# 13\. Seguridad

El panel administrativo debe estar protegido.

Como mínimo:

* inicio de sesión;
* rutas administrativas protegidas;
* validación de datos;
* autorización;
* aislamiento entre restaurantes;
* variables de entorno;
* no colocar contraseñas ni API keys en el código.

Los secretos nunca deben quedar dentro del repositorio.

\---

# 14\. Código QR

El sistema debe permitir asociar un QR a cada mesa.

Ejemplo:

``` text
Mesa 01
  ↓
QR
  ↓
https://sitio.com/menu/restaurante/mesa/01
```

El QR debe abrir directamente el menú correspondiente.

Un QR de un restaurante nunca debe permitir acceder a información
administrativa de otro restaurante.

\---

# 15\. Responsive

Probar como mínimo:

* celular;
* tablet;
* computadora.

Prioridad del menú:

`Celular > Tablet > Computadora`

Prioridad del panel administrativo:

`Computadora > Tablet > Celular`

\---

# 16\. Rendimiento

El sitio debe cargar rápidamente.

Evitar:

* imágenes innecesariamente pesadas;
* librerías innecesarias;
* consultas repetidas;
* código duplicado;
* animaciones excesivas.

Optimizar las imágenes del menú para web.

\---

# 17\. Pruebas mínimas

## Cliente

Comprobar que puede:

* abrir el QR;
* consultar el menú;
* seleccionar productos;
* modificar cantidades;
* eliminar productos;
* ver el total;
* enviar el pedido.

## Restaurante

Comprobar que puede:

* iniciar sesión;
* ver pedidos;
* identificar la mesa;
* cambiar estados;
* administrar productos;
* marcar productos agotados.

## Integridad

Comprobar que:

* un pedido pertenece al restaurante correcto;
* un producto pertenece al restaurante correcto;
* un producto agotado no puede pedirse;
* el total es correcto;
* un usuario no autorizado no puede entrar al panel.

\---

# 18\. Criterios de aceptación del MVP

El MVP se considera funcional cuando:

1. Existe un menú digital.
2. Puede abrirse mediante QR.
3. Funciona correctamente desde celular.
4. Los productos muestran nombre, precio e información básica.
5. El cliente puede agregar productos.
6. Puede modificar cantidades.
7. Puede eliminar productos.
8. Puede confirmar el pedido.
9. El pedido queda registrado.
10. El restaurante puede consultar el pedido.
11. El pedido muestra la mesa.
12. El restaurante puede cambiar el estado.
13. Los estados son Recibido, Preparando, Listo y Entregado.
14. Un producto agotado no puede pedirse.
15. Existe protección entre restaurantes.
16. Funciona correctamente en celular y computadora.

\---

# 19\. Reglas obligatorias para OpenCode

## RULE-001 --- No inventar funcionalidades

Si una funcionalidad no está definida:

1. identificar la ambigüedad;
2. explicar qué falta decidir;
3. proponer una opción;
4. pedir confirmación si afecta arquitectura o producto.

No agregar funcionalidades importantes por iniciativa propia.

## RULE-002 --- Respetar MoSCoW

No implementar funciones `Could Have` o `Won't Have` antes de terminar
las `Must Have`.

## RULE-003 --- Priorizar MVP

Primero terminar el flujo:

`QR → Menú → Carrito → Pedido → Panel → Estados`

## RULE-004 --- Cambios pequeños

Preferir cambios pequeños, claros, verificables y reversibles.

No mezclar nuevas funcionalidades con grandes refactorizaciones sin
necesidad.

## RULE-005 --- No borrar código sin comprobar dependencias

Antes de eliminar código, comprobar si otra parte del proyecto lo
utiliza.

## RULE-006 --- Mantener el proyecto ejecutable

Después de cambios importantes:

1. ejecutar el proyecto;
2. comprobar errores;
3. corregir;
4. probar la funcionalidad modificada.

## RULE-007 --- Explicar errores

Cuando algo falle, indicar:

* qué falló;
* por qué;
* archivo relacionado;
* solución propuesta.

## RULE-008 --- No colocar secretos

No escribir contraseñas, tokens ni API keys directamente en el código.

Usar variables de entorno.

## RULE-009 --- No sobre-ingeniería

No crear microservicios, sistemas complejos o integraciones externas si
el MVP puede resolverse de manera más sencilla.

\---

# 20\. Decisiones pendientes

No inventar estas decisiones.

### DEC-001 --- Nombre del restaurante

Pendiente.

### DEC-002 --- Logo

Pendiente.

### DEC-003 --- Colores definitivos

OpenCode puede proponer una identidad visual inicial y mantenerla
consistente.

### DEC-004 --- Stack tecnológico

OpenCode puede recomendarlo y explicar brevemente la elección.

### DEC-005 --- Pagos

Pendiente. No implementar en el MVP.

### DEC-006 --- Domicilio

La entrevista confirma que existe esta necesidad, pero queda después del
núcleo del MVP.

### DEC-007 --- Notificaciones

Definir posteriormente si serán:

* alerta dentro del sitio;
* sonido;
* navegador;
* correo;
* WhatsApp;
* push.

\---

# 21\. Plan de desarrollo

## Fase 1 --- Base

* estructura del proyecto;
* frontend;
* backend si es necesario;
* base de datos;
* diseño base.

## Fase 2 --- Menú

* categorías;
* productos;
* imágenes;
* precios;
* disponibilidad;
* vista móvil.

## Fase 3 --- Carrito

* agregar;
* modificar;
* eliminar;
* calcular total.

## Fase 4 --- Pedidos

* crear pedido;
* generar número;
* identificar mesa;
* guardar detalles;
* mostrar en administración.

## Fase 5 --- Estados

Implementar:

``` text
RECIBIDO
PREPARANDO
LISTO
ENTREGADO
```

## Fase 6 --- QR

* URL por restaurante/mesa;
* generación de QR;
* prueba desde celular.

## Fase 7 --- Administración

* login;
* productos;
* disponibilidad;
* pedidos;
* estados.

## Fase 8 --- Pruebas

Flujo completo:

``` text
QR
 ↓
Menú
 ↓
Producto
 ↓
Carrito
 ↓
Pedido
 ↓
Panel
 ↓
Recibido
 ↓
Preparando
 ↓
Listo
 ↓
Entregado
```

## Fase 9 --- Después del MVP

* notificaciones;
* para llevar;
* domicilio;
* estadísticas;
* productos más vendidos;
* historial.

\---

# 22\. Definición de terminado

Una tarea no se considera terminada únicamente porque compile.

Debe:

* cumplir sus requisitos;
* funcionar desde la interfaz;
* manejar errores básicos;
* ser responsive cuando corresponda;
* no romper funcionalidades existentes;
* haber sido probada;
* respetar MoSCoW;
* mantener código entendible.

\---

# 23\. Regla de evolución

Este archivo es la fuente de verdad funcional actual.

Cuando cambie una regla:

1. actualizar `requimerent.md`;
2. explicar el cambio;
3. revisar funcionalidades afectadas;
4. revisar pruebas;
5. implementar;
6. comprobar regresiones.

Las reglas importantes no deben mantenerse únicamente en conversaciones
o prompts temporales.

\---

# 24\. Resultado esperado

Al finalizar el MVP:

``` text
CLIENTE

Escanea QR
    ↓
Ve menú
    ↓
Elige productos
    ↓
Confirma pedido
```

y:

``` text
RESTAURANTE

Recibe pedido
    ↓
Ve pedido
    ↓
Prepara
    ↓
Marca LISTO
    ↓
Entrega
```

El éxito inicial se medirá principalmente por:

**ahorrar tiempo + centralizar pedidos + reducir confusiones + reducir
errores.**

