(function () {
  'use strict';
  var listeners = Object.create(null);
  var pending = Object.create(null);
  var seq = 0;
  var hash = new URLSearchParams(location.hash.slice(1));
  var initData = hash.get('haloWebAppData') || '';
  var initDataUnsafe = {};
  try {
    var query = new URLSearchParams(initData);
    initDataUnsafe = Object.fromEntries(query.entries());
    if (initDataUnsafe.user) initDataUnsafe.user = JSON.parse(initDataUnsafe.user);
  } catch {}

  function send(eventType, eventData) {
    window.parent.postMessage({ eventType: eventType, eventData: eventData || {} }, '*');
  }
  function emit(name, data) {
    (listeners[name] || []).slice().forEach(function (fn) { fn(data); });
  }
  function button(eventName) {
    var state = { text: 'CONTINUE', color: '', textColor: '', isVisible: false, isActive: true, isProgressVisible: false };
    function sync() { send(eventName, state); }
    return {
      setText: function (text) { state.text = String(text); sync(); return this; },
      show: function () { state.isVisible = true; sync(); return this; },
      hide: function () { state.isVisible = false; sync(); return this; },
      enable: function () { state.isActive = true; sync(); return this; },
      disable: function () { state.isActive = false; sync(); return this; },
      showProgress: function () { state.isProgressVisible = true; sync(); return this; },
      hideProgress: function () { state.isProgressVisible = false; sync(); return this; },
      setParams: function (params) { Object.assign(state, params || {}); sync(); return this; },
      onClick: function (fn) { WebApp.onEvent(eventName === 'web_app_setup_main_button' ? 'mainButtonClicked' : 'backButtonClicked', fn); return this; },
      offClick: function (fn) { WebApp.offEvent(eventName === 'web_app_setup_main_button' ? 'mainButtonClicked' : 'backButtonClicked', fn); return this; }
    };
  }
  function custom(method, params, callback) {
    var reqId = 'halo_' + Date.now() + '_' + (++seq);
    if (callback) pending[reqId] = callback;
    send('web_app_invoke_custom_method', { req_id: reqId, method: method, params: params || {} });
  }
  var MainButton = button('web_app_setup_main_button');
  var BackButton = button('web_app_setup_back_button');
  var WebApp = {
    initData: initData,
    initDataUnsafe: initDataUnsafe,
    version: '1.0',
    platform: /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'ios' : 'web',
    colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    themeParams: {},
    viewportHeight: innerHeight,
    viewportStableHeight: innerHeight,
    isExpanded: false,
    MainButton: MainButton,
    BackButton: BackButton,
    SettingsButton: button('web_app_setup_settings_button'),
    ready: function () { send('web_app_ready'); },
    expand: function () { send('web_app_expand'); },
    close: function () { send('web_app_close'); },
    sendData: function (data) {
      data = String(data);
      if (new TextEncoder().encode(data).length > 4096) throw new Error('WebApp data exceeds 4096 bytes');
      send('web_app_data_send', { data: data });
    },
    enableClosingConfirmation: function () { send('web_app_setup_closing_behavior', { needConfirmation: true }); },
    disableClosingConfirmation: function () { send('web_app_setup_closing_behavior', { needConfirmation: false }); },
    onEvent: function (name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); },
    offEvent: function (name, fn) { listeners[name] = (listeners[name] || []).filter(function (item) { return item !== fn; }); },
    showPopup: function (params, cb) { if (cb) WebApp.onEvent('popupClosed', cb); send('web_app_open_popup', params); },
    showAlert: function (message, cb) { WebApp.showPopup({ message: message, buttons: [{ id: 'ok', type: 'ok' }] }, cb); },
    showConfirm: function (message, cb) { WebApp.showPopup({ message: message, buttons: [{ id: 'ok', type: 'ok' }, { id: 'cancel', type: 'cancel' }] }, function (id) { cb(id === 'ok'); }); },
    HapticFeedback: {
      impactOccurred: function (style) { send('web_app_trigger_haptic', { type: 'impact', style: style }); },
      notificationOccurred: function (style) { send('web_app_trigger_haptic', { type: 'notification', style: style }); },
      selectionChanged: function () { send('web_app_trigger_haptic', { type: 'selection' }); }
    },
    CloudStorage: {
      setItem: function (key, value, cb) { custom('saveStorageValue', { key: key, value: String(value) }, cb); },
      getItem: function (key, cb) { custom('getStorageValue', { keys: [key] }, function (err, result) { cb(err, result && result.items ? result.items[key] || '' : ''); }); },
      getItems: function (keys, cb) { custom('getStorageValue', { keys: keys }, function (err, result) { cb(err, result ? result.items : {}); }); },
      getKeys: function (cb) { custom('getStorageKeys', {}, function (err, result) { cb(err, result ? result.keys : []); }); },
      removeItem: function (key, cb) { custom('deleteStorageValue', { keys: [key] }, cb); },
      removeItems: function (keys, cb) { custom('deleteStorageValue', { keys: keys }, cb); }
    },
    requestWriteAccess: function (cb) { custom('requestWriteAccess', {}, function (err) { cb(!err); }); },
    requestContact: function (cb) { custom('requestContact', { contact: { userId: initDataUnsafe.user && initDataUnsafe.user.id, firstName: initDataUnsafe.user && initDataUnsafe.user.first_name } }, function (err) { cb(!err); }); }
  };
  window.addEventListener('message', function (event) {
    var message = event.data || {};
    var data = message.eventData || {};
    if (message.eventType === 'main_button_pressed') emit('mainButtonClicked');
    if (message.eventType === 'back_button_pressed') emit('backButtonClicked');
    if (message.eventType === 'settings_button_pressed') emit('settingsButtonClicked');
    if (message.eventType === 'popup_closed') emit('popupClosed', data.button_id);
    if (message.eventType === 'viewport_changed') {
      WebApp.viewportHeight = data.height;
      WebApp.viewportStableHeight = data.height;
      WebApp.isExpanded = !!data.is_expanded;
      emit('viewportChanged', data);
    }
    if (message.eventType === 'theme_changed') { WebApp.themeParams = data.theme_params || {}; emit('themeChanged'); }
    if (message.eventType === 'custom_method_invoked' && pending[data.req_id]) {
      var cb = pending[data.req_id]; delete pending[data.req_id]; cb(data.error || null, data.result);
    }
  });
  window.Halo = window.Halo || {};
  window.Halo.WebApp = WebApp;
  window.Telegram = window.Telegram || {};
  window.Telegram.WebApp = WebApp;
})();
