# Productora Balosky - CRM operativo simple

No arrancar con un CRM pesado.

Arrancar con una planilla/pipeline simple. La funcion no es "tener una base de datos linda"; la funcion es saber:

- a quien escribir;
- que se le dijo;
- cuando volver a escribir;
- quien respondio;
- que hay que producir;
- cuanto se puede cobrar;
- que se cerro o que se perdio.

## Que hay que organizar

### 1. Prospectos

Negocios o marcas que podrian pagar una pieza.

Campos minimos:

- nombre;
- rubro;
- web/Instagram;
- contacto;
- ciudad;
- prioridad;
- por que podria pagar;
- idea concreta para ofrecer.

### 2. Conversaciones

No alcanza con "le escribi". Hay que saber que paso despues.

Estados:

- `investigar`
- `contactar`
- `contactado`
- `respondio`
- `info_enviada`
- `llamada_agendada`
- `propuesta_enviada`
- `ganado`
- `perdido`
- `dormido`

### 3. Propuestas

Cada propuesta tiene que tener:

- pieza ofrecida;
- alcance;
- valor;
- tiempos;
- que incluye;
- que no incluye;
- fecha de envio;
- proxima accion.

### 4. Producciones

Separar demos propias de trabajos para clientes.

Estados:

- `idea`
- `guion`
- `materiales`
- `ia_generada`
- `edicion`
- `revision`
- `entregado`

### 5. Costos

Registrar sobre todo lo que puede quedar invisible:

- Seedance/video IA;
- musica/licencias;
- horas de edicion;
- locacion/traslado;
- actores o colaboradores;
- pauta si se cotiza aparte.

## Pipeline recomendado

```text
Prospecto -> Contactado -> Respondio -> Info enviada -> Llamada -> Propuesta -> Ganado/Perdido
```

El dato mas importante no es el status. Es la **proxima accion**.

Ejemplos:

- mandar DM;
- hacer follow-up 48h;
- enviar propuesta;
- pedir material;
- agendar llamada;
- cerrar precio;
- soltar.

## Herramienta recomendada

Para la etapa actual:

1. Google Sheet o CSV.
2. Notion si queres verlo tipo tablero.
3. Nada de HubSpot/CRM pesado todavia.

Regla:

Si todavia no hay 30 prospectos contactados y 5 conversaciones reales, un CRM pesado es procrastinacion con interfaz linda.

## Dashboard semanal

Mirar una vez por semana:

- prospectos nuevos agregados;
- mensajes enviados;
- respuestas;
- propuestas enviadas;
- llamadas;
- ventas cerradas;
- plata potencial;
- gasto en IA/video;
- siguiente demo a producir.

## Rutina diaria minima

### 15 minutos

- revisar respuestas;
- actualizar estados;
- marcar proxima accion.

### 30 minutos

- escribir o mejorar 2 mensajes;
- verificar contactos;
- preparar una propuesta si alguien respondio.

### 60-90 minutos

- producir demo;
- editar pieza;
- preparar guion para cliente.

## Cuando si conviene sumar CRM real

Sumar CRM real si pasa alguna de estas cosas:

- hay mas de 50 prospectos vivos;
- tenes mas de 10 conversaciones abiertas;
- empezas a delegar seguimiento;
- hay propuestas que se pierden por no recordar fechas;
- necesitas automatizar recordatorios y mails.

Antes de eso, alcanza con una planilla bien usada.

## Vista ideal de la planilla

Columnas:

- `id`
- `nombre`
- `rubro`
- `prioridad`
- `estado`
- `canal`
- `contacto`
- `ultimo_contacto`
- `proximo_followup`
- `proxima_accion`
- `idea_video`
- `ticket_estimado`
- `valor_ofrecido`
- `respuesta`
- `objecion`
- `link_propuesta`
- `link_demo`
- `notas`

## Regla de cierre

Cada prospecto debe terminar en uno de tres lugares:

- vendido;
- dormido con fecha de recontacto;
- descartado con razon.

Nada deberia quedar en "no se".
