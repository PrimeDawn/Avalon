// SPEC-007 writer/plan.html §3.1: offline, current-user Windows installer.
/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'io.github.primedawn.avalon',
  productName: 'Avalon',
  executableName: 'Avalon',
  asar: true,
  files: ['out/**', 'package.json'],
  directories: { output: 'release', buildResources: 'build' },
  publish: null,
  win: { target: [{ target: 'nsis', arch: ['x64'] }] },
  nsis: {
    artifactName: 'Avalon-${version}-${arch}-Setup.${ext}',
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    installerLanguages: ['zh_CN'],
    language: '2052',
    displayLanguageSelector: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Avalon',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
    include: 'build/installer.nsh',
  },
};
