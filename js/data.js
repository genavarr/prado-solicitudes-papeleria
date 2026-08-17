// Catálogo fijo de materiales de papelería y valores por defecto de la app.

const MATERIALS = [
  { id: 'm01', nombre: 'Paquete de 500 hojas blancas tamaño carta', unidad: 'paquete' },
  { id: 'm02', nombre: 'Paquete de 100 hojas de colores tamaño carta', unidad: 'paquete' },
  { id: 'm03', nombre: 'Paquete de hoja opalina tamaño carta color blanco (100 hojas, 125g/m2)', unidad: 'paquete' },
  { id: 'm04', nombre: 'Block de papel construcción', unidad: 'block' },
  { id: 'm05', nombre: 'Paquete de fichas bibliográficas de rayas de 3 x 5 pulgadas', unidad: 'paquete' },
  { id: 'm06', nombre: 'Paquete de fichas bibliográficas blancas de media carta', unidad: 'paquete' },
  { id: 'm07', nombre: 'Marcador Sharpie negro de punta fina', unidad: 'pieza' },
  { id: 'm08', nombre: 'Cinta de espuma doble cara marca 3M', unidad: 'pieza' },
  { id: 'm09', nombre: 'Pliego de cartulina blanca', unidad: 'pliego' },
  { id: 'm10', nombre: 'Pliego de papel bond blanco', unidad: 'pliego' },
  { id: 'm11', nombre: 'Pliego de papel bond cuadros', unidad: 'pliego' },
  { id: 'm12', nombre: 'Rollo de papel Contac autoadherible transparente', unidad: 'rollo' },
  { id: 'm13', nombre: 'Paquete de 6 a 8 plumones de colores para pizarrón blanco', unidad: 'paquete' },
  { id: 'm14', nombre: 'Paquete de 4 plumones para pizarrón blanco', unidad: 'paquete' },
  { id: 'm15', nombre: 'Cinta adhesiva transparente gruesa', unidad: 'pieza' },
  { id: 'm16', nombre: 'Cinta adhesiva transparente delgada', unidad: 'pieza' },
  { id: 'm17', nombre: 'Cinta masking tape gruesa', unidad: 'pieza' },
  { id: 'm18', nombre: 'Cinta masking tape delgada', unidad: 'pieza' },
  { id: 'm19', nombre: 'Barra de plastilina', unidad: 'barra' },
  { id: 'm20', nombre: 'Botella de silicón líquido', unidad: 'botella' },
  { id: 'm21', nombre: 'Barras de silicón', unidad: 'paquete' },
  { id: 'm22', nombre: 'Paquete de foamy tamaño carta de varios colores', unidad: 'paquete' },
  { id: 'm23', nombre: 'Pliego de foamy', unidad: 'pliego' },
  { id: 'm24', nombre: 'Pliego de papel crepé', unidad: 'pliego' },
  { id: 'm25', nombre: 'Paquete de toallitas húmedas Clorox', unidad: 'paquete' },
  { id: 'm26', nombre: 'Pegamento blanco Resistol 850 de 225 g', unidad: 'pieza' },
  { id: 'm27', nombre: 'Barra de cerámica (plastilina cerámica)', unidad: 'barra' },
  { id: 'm28', nombre: 'Retazos de tela', unidad: 'bolsa' },
  { id: 'm29', nombre: 'Litro de pintura acrílica', unidad: 'litro' },
  { id: 'm30', nombre: 'Bote de ¼ de pintura de agua escolar', unidad: 'bote' },
  { id: 'm31', nombre: 'Abatelenguas', unidad: 'paquete' },
  { id: 'm32', nombre: 'Pompones de colores', unidad: 'paquete' },
];

const DEFAULT_SECTIONS = [
  'Maternal', 'Preescolar 1', 'Preescolar 2', 'Preescolar 3',
  '1° A', '1° B', '2° A', '2° B', '3° A', '3° B',
  '4° A', '4° B', '5° A', '5° B', '6° A', '6° B',
];

const DEFAULT_SETTINGS = {
  claveAdmin: 'admin123',
  claveCoordinadora: 'coord123',
  nombreColegio: 'Colegio',
  sections: DEFAULT_SECTIONS,
};
