/**
 * WhatsApp Broadcast Master
 * Google Sheets menu, dialogs, and first-run setup.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu(DEFAULTS.PRODUCT_NAME)
    .addItem('Open Broadcast Master', 'menuOpenBroadcastMaster')
    .addItem('Settings', 'menuOpenSettings')
    .addItem('Test Connection', 'menuTestConnection')
    .addItem('Refresh Templates', 'menuRefreshTemplates')
    .addSeparator()
    .addItem('Validate Campaign', 'menuValidateCampaign')
    .addItem('Start Campaign', 'menuStartCampaign')
    .addItem('Pause Campaign', 'menuPauseCampaign')
    .addItem('Resume Campaign', 'menuResumeCampaign')
    .addItem('View Campaign Status', 'menuViewStatus')
    .addItem('View Logs', 'menuViewLogs')
    .addSeparator()
    .addItem('Setup Demo Data', 'menuSetupDemo')
    .addItem('Create Demo Campaign', 'menuDemoCampaign')
    .addItem('Help', 'menuHelp')
    .addToUi();
  try {
    SheetService.ensureWorkbook();
  } catch (error) {
    Logger.log(error);
  }
}

function onInstall(e) {
  onOpen(e);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function showApp_(page) {
  SheetService.ensureWorkbook();
  var html = HtmlService.createTemplateFromFile('App');
  html.initialPage = page || 'home';
  SpreadsheetApp.getUi().showModelessDialog(
    html.evaluate()
      .setWidth(920)
      .setHeight(680)
      .setTitle(DEFAULTS.PRODUCT_NAME),
    DEFAULTS.PRODUCT_NAME
  );
}

function showSidebar_(page) {
  SheetService.ensureWorkbook();
  var html = HtmlService.createTemplateFromFile('App');
  html.initialPage = page || 'dashboard';
  SpreadsheetApp.getUi().showSidebar(
    html.evaluate()
      .setTitle(DEFAULTS.PRODUCT_NAME)
      .setWidth(420)
  );
}

function menuOpenBroadcastMaster() {
  showApp_('home');
}

function menuOpenSettings() {
  showApp_('settings');
}

function menuHelp() {
  showApp_('help');
}

function menuViewStatus() {
  showSidebar_('dashboard');
}

function menuViewLogs() {
  showApp_('logs');
}

function menuTestConnection() {
  var result = testConnectionFromUi();
  SpreadsheetApp.getUi().alert(result.title, result.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuRefreshTemplates() {
  var result = refreshTemplatesFromUi();
  SpreadsheetApp.getUi().alert(
    result.ok ? 'Templates refreshed' : 'Could not refresh templates',
    result.ok ? result.usable + ' approved templates are ready to use.' : result.error,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuValidateCampaign() {
  showApp_('campaign');
}

function menuStartCampaign() {
  showApp_('campaign');
}

function menuPauseCampaign() {
  var result = pauseCampaignFromUi();
  SpreadsheetApp.getUi().alert(
    result.ok ? 'Campaign paused' : 'Unable to pause',
    result.ok ? 'No additional messages will be sent until you resume.' : result.error,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuResumeCampaign() {
  var result = resumeCampaignFromUi();
  SpreadsheetApp.getUi().alert(
    result.ok ? 'Campaign resumed' : 'Unable to resume',
    result.ok ? 'Sending will continue from pending recipients.' : result.error,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuSetupDemo() {
  var result = setupDemoDataFromUi();
  SpreadsheetApp.getUi().alert(
    'Demo data ready',
    result.ok
      ? 'Sample contacts were added and Mock Mode is on. No real WhatsApp messages will be sent.'
      : 'Could not create demo data.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function menuDemoCampaign() {
  createDemoCampaignFromUi();
  showApp_('campaign');
}

function setupWorkbook() {
  return SheetService.ensureWorkbook();
}
