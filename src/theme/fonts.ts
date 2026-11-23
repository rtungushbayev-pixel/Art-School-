// Художественные шрифты (Google Fonts, лицензия SIL OFL), есть казахские буквы.
// Загружаются в App.tsx через useFonts; пока не загрузились, виден системный шрифт.
// С этими шрифтами не задаём fontWeight: начертание уже в самом файле.
export const fonts = {
  hand: 'Caveat_700Bold', // заголовки «от руки», как в скетчбуке
  round: 'Comfortaa_500Medium', // мягкий текст
  roundBold: 'Comfortaa_700Bold',
};
