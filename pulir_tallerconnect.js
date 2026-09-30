const fs = require('fs');

const files = [
  'src/app/(cliente)/cliente.tsx',
  'src/app/(mecanico)/mecanico.tsx',
  'src/app/(admin)/administrador.tsx',
];

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`❌ No existe: ${file}`);
    process.exitCode = 1;
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');

  /*
   * ============================================================
   * 1. IMPORTAR colors
   * ============================================================
   */

  content = content.replace(
    /import\s*\{\s*radius,\s*spacing,\s*\}\s*from\s*['"]@\/constants\/theme['"];/,
    `import {
  colors,
  radius,
  spacing,
} from '@/constants/theme';`
  );

  /*
   * ============================================================
   * 2. ELIMINAR DECORACIÓN DE FONDO SI TODAVÍA EXISTE
   * ============================================================
   */

  content = content.replace(
    /\s*\{\/\* =====================================\s*DECORACI[ÓO]N(?: DE FONDO)?\s*===================================== \*\/\}\s*<View\s*pointerEvents="none"\s*style=\{styles\.decorations\}\s*>[\s\S]*?<\/View>\s*(?=\{\/\* =====================================\s*ENCABEZADO)/,
    '\n\n        {/* =====================================\n            ENCABEZADO\n            ===================================== */}\n'
  );

  content = content.replace(
    /\s*\{\/\* =====================================\s*DECORACI[ÓO]N\s*===================================== \*\/\}\s*<View\s*pointerEvents="none"\s*style=\{styles\.decorations\}\s*>[\s\S]*?<\/View>\s*(?=\{\/\* =====================================\s*ENCABEZADO)/,
    '\n\n        {/* =====================================\n            ENCABEZADO\n            ===================================== */}\n'
  );

  /*
   * ============================================================
   * 3. SCROLLVIEW
   * ============================================================
   */

  content = content.replace(
    /<ScrollView\s+contentContainerStyle=\{styles\.container\}\s+showsVerticalScrollIndicator=\{false\}\s*>/,
    `<ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios'
            ? 'interactive'
            : 'on-drag'
        }
      >`
  );

  /*
   * ============================================================
   * 4. ELIMINAR PADDING TOP MANUAL DE ANDROID
   * ============================================================
   */

  content = content.replace(
    /,\s*paddingTop:\s*Platform\.OS === 'android' \? 40 : 0/,
    ''
  );

  content = content.replace(
    /paddingTop:\s*Platform\.OS === 'android' \? 40 : 0,\s*/g,
    ''
  );

  /*
   * ============================================================
   * 5. TEMA ANTIGUO -> NUEVA PALETA
   * ============================================================
   */

  content = content.replace(
    /const localTheme = \{[\s\S]*?\n\};/,
    `const localTheme = {
  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceSoft,
  border: colors.border,

  primary: colors.primary,
  primaryDark: colors.primary,

  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textSecondary,

  accent: colors.accent,
  info: colors.info,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};`
  );

  /*
   * ============================================================
   * 6. ELIMINAR ESTILOS DE DECORACIÓN
   * ============================================================
   */

  const decorationStyles = [
    'decorations',
    'orbRedLarge',
    'orbDarkRed',
    'crystalRed',
    'crystalGrey',
    'ringStrong1',
    'ringStrong2',
    'glowDot1',
    'glowDot2',
    'glowDot3',
  ];

  for (const styleName of decorationStyles) {
    const regex = new RegExp(
      `\\n\\s*${styleName}:\\s*\\{[\\s\\S]*?\\n\\s*\\},(?=\\n\\s*\\w+:\\s*\\{)`,
      'g'
    );

    content = content.replace(regex, '');
  }

  /*
   * ============================================================
   * 7. COLORES ANTIGUOS DIRECTOS
   * ============================================================
   */

  content = content.replace(
    /'#C94A4A'/g,
    'colors.accent'
  );

  content = content.replace(
    /'#34C759'/g,
    'colors.success'
  );

  content = content.replace(
    /'#F5A623'/g,
    'colors.warning'
  );

  content = content.replace(
    /'#5AC8FA'/g,
    'colors.info'
  );

  content = content.replace(
    /'#AF52DE'/g,
    'colors.info'
  );

  content = content.replace(
    /'#A0A0A0'/g,
    'colors.textSecondary'
  );

  /*
   * ============================================================
   * 8. FONDOS ANTIGUOS
   * ============================================================
   */

  content = content.replace(
    /backgroundColor:\s*'#240606'/g,
    'backgroundColor: colors.surfaceSoft'
  );

  /*
   * ============================================================
   * 9. SOMBRAS ANTIGUAS
   * ============================================================
   */

  content = content.replace(
    /shadowColor:\s*'#000000'/g,
    'shadowColor: colors.primary'
  );

  /*
   * ============================================================
   * 10. BORDE/COLORES GENERALES
   * ============================================================
   */

  content = content.replace(
    /borderColor:\s*'#2A2A2A'/g,
    'borderColor: colors.border'
  );

  content = content.replace(
    /backgroundColor:\s*'#1A1A1A'/g,
    'backgroundColor: colors.surfaceSoft'
  );

  content = content.replace(
    /backgroundColor:\s*'#121212'/g,
    'backgroundColor: colors.surface'
  );

  content = content.replace(
    /backgroundColor:\s*'#070707'/g,
    'backgroundColor: colors.background'
  );

  content = content.replace(
    /backgroundColor:\s*'#333333'/g,
    'backgroundColor: colors.surfaceSoft'
  );

  content = content.replace(
    /color:\s*'#FFFFFF'/g,
    'color: colors.text'
  );

  content = content.replace(
    /color:\s*'#666666'/g,
    'color: colors.textSecondary'
  );

  /*
   * ============================================================
   * 11. BORDE DE BOTÓN LOGOUT
   * ============================================================
   */

  content = content.replace(
    /borderColor:\s*localTheme\.border/g,
    'borderColor: colors.border'
  );

  /*
   * ============================================================
   * 12. GUARDAR
   * ============================================================
   */

  fs.writeFileSync(file, content, 'utf8');

  console.log(`✅ Modificado: ${file}`);
}

console.log('');
console.log('==========================================');
console.log(' Cambios visuales aplicados');
console.log('==========================================');
console.log('');
console.log('Ahora ejecuta:');
console.log('npm run typecheck');
console.log('npm test -- --runInBand');
console.log('npm run lint');