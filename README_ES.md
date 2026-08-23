# Horas peak y off-peak de DeepSeek: días laborables en hora de Pekín, no en UTC

[English](./README.md) · [中文](./README_CN.md) · **Español** · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Tiếng Việt](./README_VI.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md) · [Русский](./README_RU.md) · [Bahasa Indonesia](./README_ID.md)

El horario peak es **de lunes a viernes, 09:00–12:00 y 14:00–18:00 hora de Pekín** — `01:00-04:00` y `06:00-10:00` UTC — y todo lo demás es off-peak, a mitad de precio. Desde el 2026-08-23 el fin de semana entero es off-peak, y ese fin de semana está delimitado en hora de Pekín: va **de las 16:00 UTC del viernes a las 16:00 UTC del domingo**, no de medianoche a medianoche UTC. Este repositorio es la tabla de pruebas fechada que fija esos bordes, más una implementación de referencia de unas treinta líneas.

**¿Estamos en hora punta ahora mismo?** [Esta página lo responde en vivo](https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html): resuelve el reloj en tu navegador, aplica la regla del día de la semana y la del fin de semana, y te dice en qué lado de la tarifa estás y cuánto falta para que cambie. Sin cuenta y sin instalar nada.

**Nueve plugins de facturación de DeepSeek publicados, pasados por esta tabla: dos la superan entera.** Sin dependencias, Node 16+; la función de cada proyecto está transcrita en `conformance/adapters.mjs` y fijada a un commit.

```
git clone https://github.com/xyzs996/deepseek-peak-hours && cd deepseek-peak-hours
node conformance/run.mjs --detail
```

## Precios (USD por millón de tokens, off-peak / peak)

| Modelo | Entrada, acierto de caché | Entrada, fallo de caché | Salida |
| --- | ---: | ---: | ---: |
| `deepseek-v4-flash` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-flash-vision-exp` | 0.007 / 0.014 | 0.22 / 0.44 | 0.66 / 1.32 |
| `deepseek-v4-pro` | 0.022 / 0.044 | 0.66 / 1.32 | 1.98 / 3.96 |

Leídos el 2026-08-23 en <https://api-docs.deepseek.com/quick_start/pricing/>. Los precios cambian; manda la página del proveedor.

## Lo que dicen las dos versiones de la página del proveedor

> **EN** — Off-peak rates are half of the peak rates. Peak hours are 01:00 - 04:00 and 06:00 - 10:00 UTC, Monday through Friday (all other hours are off-peak).

> **ZH** — 空闲时段价格为高峰时段价格的一半。高峰时段为北京时间周一至周五 9:00 - 12:00、14:00 - 18:00（其余为空闲时段）。

Las dos citas se dejan en su idioma original: son la prueba, y traducidas dejan de ser la cita. Las horas coinciden — 09:00–12:00 y 14:00–18:00 de Pekín *son* 01:00–04:00 y 06:00–10:00 UTC. El calendario no. La frase china sitúa los días laborables en hora de Pekín (北京时间周一至周五); la inglesa pega `UTC` a las horas y deja «Monday through Friday» sin anclar, lo que se lee como días laborables UTC. Las dos lecturas difieren entre las 16:00 y las 24:00 UTC del viernes y del domingo: dieciséis horas por semana. Este repositorio sigue la redacción china.

## Tres formas de equivocarse, y la tercera es invisible

**1. Retroactividad.** Las funciones de precio se llaman con marcas de tiempo históricas — reproducción del libro mayor, recálculo de consumo, paneles de coste sobre peticiones pasadas. Un descuento de fin de semana incondicional reduce en silencio toda factura de fin de semana anterior a la regla. El descuento tiene que depender del instante de entrada en vigor, y para una cuenta atrás la comprobación va sobre el instante *candidato*, no sobre «ahora».

**2. La cuenta atrás cae dentro del fin de semana.** Dentro del fin de semana, ambos lados de cada borde de ventana son off-peak, así que una cuenta atrás que se detiene en el siguiente borde llega a cero sin que cambie nada. Desde el viernes 18:30 de Pekín, el siguiente cambio real es el lunes a las 09:00: unas 63 horas, suficiente para que algunos textos de interfaz se desborden.

**3. El día de la semana se lee del calendario equivocado, y ninguna prueba contra el horario vigente puede detectarlo.** El fin de semana de Pekín va **de las 16:00 UTC del viernes a las 16:00 UTC del domingo**. Los dos calendarios sólo difieren entre las 16:00 y las 24:00 UTC, y las dos ventanas peak de DeepSeek quedan fuera de ese tramo. Así que una implementación que lee el día del instante sin desplazar pasa todos los vectores que puedas escribir contra las ventanas oficiales, y empieza a mentir el día en que un proveedor mueva una ventana más allá de las 16:00 UTC.

## Los dos instantes que fijan el eje del calendario

`2026-08-28T16:30:00Z` y `2026-08-30T16:30:00Z`. La tabla incluye además un horario **claramente etiquetado como sintético** cuya ventana peak cubre de 16:00 a 22:00 UTC. No es un horario real de proveedor ni se ofrece como tal: es la única manera de fijar el eje del calendario. Y si tu código de precios no está parametrizado por horario, este eje no se puede probar en absoluto, lo cual ya vale la pena saberlo.

## Cómo usarlo

O portas `phase_at` — son treinta líneas aburridas y el horario es un dato — o ignoras el Python por completo y pegas el array `vectors` en lo que tu proyecto use para pruebas dirigidas por tabla. Cada entrada es un instante UTC, el reloj de pared de Pekín que le corresponde, la fase esperada y una línea sobre qué distingue.

```
python3 check_vectors.py     # 18/18 passed
```

## En otra parte

- La misma regla en prosa, con las dos versiones de la nota del proveedor una junto a otra y cada tarifa releída a diario: <https://xyzs996.github.io/llm-api-pricing/deepseek-peak-hours.html> · [telegra.ph](https://telegra.ph/DeepSeek-peak-and-off-peak-hours-08-23)
- Una calculadora que aplica estas reglas a una factura real: eliges modelo, pones tu mezcla de tokens y te dice de qué lado del tarifario estás ahora mismo y cuánto vale esperar: <https://xyzs996.github.io/llm-cost-calculator/>
- El README completo en inglés (vectores uno a uno, la tabla de mutaciones y la muestra de 19 implementaciones): <https://github.com/xyzs996/deepseek-peak-hours/blob/main/README.md>
