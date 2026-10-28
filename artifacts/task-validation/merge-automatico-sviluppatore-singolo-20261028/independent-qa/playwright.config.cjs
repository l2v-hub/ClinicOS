module.exports = {
  testDir: __dirname,
  testMatch: 'qa-surface.spec.cjs',
  outputDir: `${__dirname}/test-results`,
  reporter: [['list'], ['html', { outputFolder: `${__dirname}/playwright-report`, open: 'never' }], ['json', { outputFile: `${__dirname}/test-results/report.json` }]],
  use: { headless: true, launchOptions: { executablePath: '/usr/bin/chromium' }, trace: 'on' },
};
