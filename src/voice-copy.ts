export const voiceCopy = {
  title: 'Voz del guía',
  notice: (providers: readonly string[]) => (providers.length
    ? `Si eliges voz, tu grabación se envía al servidor del museo y a ${providers.join(' y ')}, servicios externos que la transcriben o generan la voz de la respuesta.`
    : 'Si eliges voz, tu grabación se envía al servidor del museo y se procesa allí con motores locales.')
    + ' El micrófono solo se activa mientras grabas. El museo no guarda el audio ni el texto ni los añade al catálogo. Puedes cancelar en cualquier momento.',
  consent: 'Acepto este procesamiento para mis consultas de voz durante esta visita.',
  response: 'Solicitar también la respuesta en audio',
  record: (seconds: number) => `Grabar pregunta (máximo ${seconds} s)`,
  recording: 'Grabando. Pulsa «Detener y transcribir» cuando termines.',
  stop: 'Detener y transcribir',
  discard: 'Descartar grabación',
  microphoneError: 'No fue posible usar el micrófono. Puedes escribir tu pregunta.',
  upload: 'O elige una grabación de tu pregunta (archivo WAV de hasta 30 segundos)',
  review: 'Revisa la transcripción en el campo de pregunta antes de enviarla al guía.',
  transcribing: 'Transcribiendo…',
  transcriptionError: 'No fue posible transcribir el audio. Puedes escribir tu pregunta.',
  cancel: 'Cancelar transcripción',
  unavailable: 'No fue posible generar el audio. Puedes leer la respuesta y sus fuentes.',
  audio: 'Escuchar la respuesta del guía',
} as const
