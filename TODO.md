# TODO List

## Completed Tasks ✅

- [x] **analyze_turno_system** - Analizar sistema actual de turnos y frecuencias para entender validaciones
- [x] **review_frequency_logic** - Revisar lógica de cálculo de frecuencias y prioridades de rutas
- [x] **integrate_programados** - Integrar programados con turnos manteniendo orden temporal
- [x] **update_route_names** - Cambiar nombres: Ruta A/B/C → Despacho A/B/C
- [x] **add_new_despachos** - Agregar cards para DESPACHO D, E y D RUT4 PAMPA-CORZO
- [x] **implement_programado_huecos** - Mostrar programados disponibles en huecos con validación de hora
- [x] **add_time_restrictions** - Implementar restricciones horarias para turnos cuando hay programados
- [x] **update_alternation_logic** - Actualizar lógica de alternancia considerando programados
- [x] **add_print_to_consulta** - Agregar botón de impresión en consulta de turnos por vehículo
- [x] **fix-fecha-comparison** - Arreglar comparación de fechas en endpoints de programados para mostrar día actual
- [x] **show-programados-rutas-movil** - Mostrar rutas programadas en la sección 'Rutas del Móvil'
- [x] **fix-auth-import-error** - Arreglar error de importación de auth() en endpoint de turnos
- [x] **fix-despacho-c-once-daily** - Arreglar validación de Despacho C unaVezDia para considerar tanto turnos como programados
- [x] **fix-route-name-comparison** - Arreglar comparación de nombres de rutas en validación unaVezDia (Despacho C vs C)
- [x] **fix-alternation-logic-names** - Arreglar lógica de alternancia A/B para usar nombres completos (Despacho A vs A)
- [x] **fix-receipt-printing-error** - Arreglar error de impresión de recibos relacionado con auth() y mejorar manejo de errores
- [x] **fix-available-programados-huecos** - Agregar logs detallados para diagnosticar por qué los programados disponibles no aparecen como huecos
- [x] **fix-programado-time-comparison** - Arreglar comparación de horas de programados para usar fecha del programado en lugar de fecha actual
- [x] **allow-remove-mobiles-programado** - Permitir eliminar móviles en /programado para crear programados disponibles como huecos

## Current Tasks 🔄

- [x] **test-programado-removal** - Probar funcionalidad de eliminar móviles en /programado y verificar que aparezcan como huecos en /turno
- [x] **fix-empty-slots-validation** - Corregir validación de slots vacíos para permitir eliminar móviles
- [x] **fix-prisma-relation-update** - Corregir sintaxis de Prisma para actualizar relaciones móvil en programación

## Pending Tasks 📋

- [ ] **optimize-performance** - Optimizar rendimiento de la aplicación
- [ ] **add-unit-tests** - Agregar pruebas unitarias para funciones críticas
- [ ] **improve-error-handling** - Mejorar manejo de errores en toda la aplicación
