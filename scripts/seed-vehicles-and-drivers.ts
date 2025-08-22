import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const data = [
    { movil: '923', placa: 'SWP997', conductor: 'ADMINISTRACION/NO TIENE CONDUCTOR' },
    { movil: '1080', placa: 'SJQ119', conductor: 'NELSON DELGADO' },
    { movil: '1084', placa: 'SYT402', conductor: 'LUIS MAURICIO BAQUERO MORA' },
    { movil: '1118', placa: 'SWK218', conductor: 'DIEGO BOSSA' },
    { movil: '1144', placa: 'WFV225', conductor: 'GIOVANNY MARTINEZ' },
    { movil: '1177', placa: 'WNL041', conductor: 'VICTOR JAVIER CUERVO' },
    { movil: '1213', placa: 'SWN550', conductor: 'NO TIENE CONDUCTOR' },
    { movil: '1238', placa: 'EQO204', conductor: 'ADMINISTRACION/NO TIENE CONDUCTOR' },
    { movil: '1254', placa: 'SXH740', conductor: 'LUIS ANTONIO CADENA' },
    { movil: '1256', placa: 'SRF141', conductor: 'NO TIENE CONDUCTOR' },
    { movil: '1273', placa: 'THX757', conductor: 'WILMER YESID FUQUENE' },
    { movil: '1275', placa: 'SMD039', conductor: 'DANIEL SANABRIA BALLEN' },
    { movil: '1297', placa: 'SMO770', conductor: 'JAIRO CLAVIJO' },
    { movil: '1313', placa: 'SWM945', conductor: 'PROCESO VENTA' },
    { movil: '1317', placa: 'SWN248', conductor: ['JULIO CESAR SANCHEZ PARADA', 'ANGIE CHUCHOQUE'] },
    { movil: '1323', placa: 'WLL335', conductor: 'HENRY AUGUSTO BAQUERO MORA' },
    { movil: '1324', placa: 'SMN517', conductor: 'DIEGO RIAGA' },
    { movil: '1326', placa: 'SRF564', conductor: 'ANGEL GABRIEL SABOGAL MORA' },
    { movil: '1337', placa: 'SVF252', conductor: 'JUAN ENRIQUE MARTIN BERNAL' },
    { movil: '1338', placa: 'SRE978', conductor: 'ELVER FABIAN OLIVO' },
    { movil: '1339', placa: 'SYS312', conductor: 'NO TIENE CONDUCTOR' },
    { movil: '1344', placa: 'SWL831', conductor: 'MIGUEL FERNANDO AVENDAÑO' },
    { movil: '1352', placa: 'UFW297', conductor: 'FREDY LUGO CHAVEZ' },
    { movil: '1353', placa: 'WFV792', conductor: 'ANGEL CUSTODIO VELASCO' },
    { movil: '1363', placa: 'SWP826', conductor: ['LUIS CARLOS VILLALOBOS GUZMAN', 'PABLO JOSE PEÑA'] },
    { movil: '1370', placa: 'WLL921', conductor: ['ALONSO NIÑO VALENCIA', 'EDWIN YUFRED VELOSA MAHECHA'] },
    { movil: '1376', placa: 'SRL173', conductor: ['RODRIGO GUERRERO SANTANA', 'JHON JAIRO BECERRA'] },
    { movil: '1377', placa: 'SWP504', conductor: 'HELBER YESID GARCIA SANCHEZ' },
    { movil: '1380', placa: 'WNK622', conductor: 'JOHAN CADENA ZAMORA' },
    { movil: '1381', placa: 'WOW449', conductor: ['JEFERSSON SANCHEZ PARADA', 'ANGIE CHUCHOQUE'] },
    { movil: '1389', placa: 'SRF586', conductor: ['WILI REDO AMADO PEÑA', 'DAVID FERNANDO AMADO ARDILA'] },
    { movil: '1396', placa: 'SMD361', conductor: 'DEISSON ANDREY MUÑOZ' },
    { movil: '1397', placa: 'WLK259', conductor: 'JONATHAN GUERRERO' },
    { movil: '1400', placa: 'SWN739', conductor: ['FERNANDO RUIZ', 'JHON JAIRO BECERRA'] },
    { movil: '1401', placa: 'WLL258', conductor: 'YAMIR PEÑA' },
    { movil: '1410', placa: 'SYT865', conductor: ['JOSE NUMEN SANTO FONSECA CORONADO', 'JHONATAN ESTIBEN SANTANA SANCHEZ'] },
    { movil: '1411', placa: 'SWL375', conductor: 'JUAN CARLOS ESTUPIÑAN' },
    { movil: '1412', placa: 'SRF582', conductor: ['JOSE ALEXANDER FONSECA QUIROGA', 'GIOVANNI SANTANA QUIROGA'] },
    { movil: '1413', placa: 'SRF511', conductor: 'MILDER FERLEY VILLAMIL CASTELLANOS' },
    { movil: '1414', placa: 'SPU806', conductor: ['JENRRY BENAVIDES JIMENES', 'JUAN EDUARDO SANABRIA MORENO'] },
    { movil: '1418', placa: 'TBZ511', conductor: 'CARLOS MALPICA' },
    { movil: '1420', placa: 'SWK901', conductor: ['JUAN EDUARDO SANABRIA MORENO', 'JHON ALEXANDER CARREÑO RAMIREZ'] },
    { movil: '1423', placa: 'SYT475', conductor: ['RUSEL FARID PALOMINO BARRERA', 'CARLOS JAVIER ZUÑIGA ARAQUE'] },
    { movil: '1424', placa: 'SPT981', conductor: ['VLADIMIR FERNANDEZ CARDENAS', 'JUAN EDUARDO SANABRIA MORENO'] },
    { movil: '1425', placa: 'SLI282', conductor: ['KARLA JULIANA MARTIN MALDONADO', 'MAURICIO MARTIN'] },
    { movil: '1426', placa: 'SYT910', conductor: ['NICOLAS IBAÑEZ MORENO', 'JONATHAN STIVEN CORTES'] },
    { movil: '1427', placa: 'SRF009', conductor: 'JOSE CIRO ROJAS CASTRO' },
    { movil: '1429', placa: 'WLL920', conductor: ['ALONSO NIÑO VALENCIA', 'EDWIN YUFRED VELOSA MAHECHA'] },
    { movil: '1430', placa: 'USE849', conductor: 'JUAN PABLO LUGO VELOSA' },
    { movil: '1431', placa: 'WLL710', conductor: ['MAURICIO SUAREZ PACHECO', 'JUAN EDUARDO SANABRIA MORENO'] },
    { movil: '1434', placa: 'SZN441', conductor: 'GIOVANNI PEREZ CRUZ' },
    { movil: '1435', placa: 'SRF581', conductor: ['CARLOS JAVIER ZUÑIGA ARAQUE', 'RUSEL FARID PALOMINO BARRERO', 'BRAYAN ANDREY MORA GUARTOS'] },
    { movil: '1437', placa: 'SMO041', conductor: 'RODRIGO RINCON VIVIESCAS' },
    { movil: '1439', placa: 'SWM469', conductor: 'WILSON GARCIA RIVERA' },
    { movil: '1441', placa: 'SRL083', conductor: 'CARLOS ANDRES GALVIS' },
    { movil: '1442', placa: 'SZO844', conductor: 'BILMAR ALBEIRO PIRABAGUEZ AYALA' },
    { movil: '1443', placa: 'SZO851', conductor: 'HECTOR RAMON RUANO REYES' },
    { movil: '1444', placa: 'SLJ005', conductor: 'JOSE DAVID BARRERO MUÑETONES' },
];

function generateRandomCedula() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function getRandomDate() {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log(`Start seeding ...`);

  for (const item of data) {
    let automovil = await prisma.automovil.findFirst({
      where: { movil: item.movil },
    });

    if (!automovil) {
      automovil = await prisma.automovil.create({
        data: {
          movil: item.movil,
          placa: item.placa,
          soat: getRandomDate(),
          revisionTecnomecanica: getRandomDate(),
          tarjetaOperacion: getRandomDate(),
          licenciaTransito: getRandomDate(),
          extintor: getRandomDate(),
          revisionPreventiva: getRandomDate(),
          revisionAnual: getRandomDate(),
        },
      });
    } else {
      // Actualizar la placa si es diferente
      if (automovil.placa !== item.placa) {
        automovil = await prisma.automovil.update({
          where: { id: automovil.id },
          data: { placa: item.placa },
        });
      }
    }

    const conductores = Array.isArray(item.conductor) ? item.conductor : [item.conductor];

    for (const nombreConductor of conductores) {
      if (nombreConductor && !['NO TIENE CONDUCTOR', 'ADMINISTRACION/NO TIENE CONDUCTOR', 'PROCESO VENTA'].includes(nombreConductor)) {
        let conductor = await prisma.conductor.findFirst({
          where: { nombre: nombreConductor },
        });

        if (!conductor) {
          conductor = await prisma.conductor.create({
            data: {
              nombre: nombreConductor,
              cedula: generateRandomCedula(),
            },
          });
        }

        const existingLink = await prisma.conductorAutomovil.findFirst({
            where: {
                conductorId: conductor.id,
                automovilId: automovil.id,
            }
        });

        if (!existingLink) {
            await prisma.conductorAutomovil.create({
                data: {
                    conductorId: conductor.id,
                    automovilId: automovil.id,
                }
            });
        }

        console.log(`Created/updated automovil ${automovil.movil} and linked conductor ${conductor.nombre}`);
      } else {
        console.log(`Skipping conductor for automovil ${automovil.movil}`);
      }
    }
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
