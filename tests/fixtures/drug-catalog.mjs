/** Synthetic catalog with the same missing strength fields observed in AIFA data. */
export async function seedDrugCatalog(prisma) {
  const specs = [
    ...Array.from({ length: 14 }, (_, i) => ({
      aic: String(11000000 + i).padStart(9, '0'),
      description: `500 MG COMPRESSE - ${i + 8} COMPRESSE`,
      form: 'Compressa',
    })),
    { aic: '012745170', description: '1000 MG COMPRESSE - 8 COMPRESSE', form: 'Compressa' },
    { aic: '012745182', description: '1000 MG COMPRESSE - 16 COMPRESSE', form: 'Compressa' },
    {
      aic: '012745199',
      description: '1000 MG COMPRESSE EFFERVESCENTI - 12 COMPRESSE',
      form: 'Compressa effervescente',
    },
    { aic: '012745200', description: '1000 MG SUPPOSTE - 10 SUPPOSTE', form: 'Supposta' },
    { aic: '012745201', description: '120 MG/5 ML SCIROPPO - FLACONE 120 ML', form: 'Sciroppo' },
    {
      aic: '012745202',
      description: '1000 MG COMPRESSE A RILASCIO MODIFICATO - 10 COMPRESSE',
      form: 'Compressa a rilascio modificato',
    },
  ];
  for (const spec of specs) {
    await prisma.farmaco.create({
      data: {
        aic: spec.aic,
        denominazione: 'TACHIPIRINA',
        denominazioneNorm: 'TACHIPIRINA',
        descrizione: spec.description,
        forma: spec.form,
        statoAmministrativo: 'Autorizzata',
        principiAttivi: {
          create: {
            principioAttivo: 'PARACETAMOLO',
            principioAttivoNorm: 'PARACETAMOLO',
            quantita: null,
            unitaMisura: null,
          },
        },
      },
    });
  }
  await prisma.farmaco.createMany({
    data: Array.from({ length: 30 }, (_, index) => ({
      aic: String(900000000 + index),
      denominazione: 'PAGINATO SINTETICO',
      denominazioneNorm: 'PAGINATO SINTETICO',
      descrizione: `5 MG COMPRESSE - ${index + 1} COMPRESSE`,
      forma: 'Compressa',
      statoAmministrativo: 'Autorizzata',
    })),
  });
  return specs;
}
