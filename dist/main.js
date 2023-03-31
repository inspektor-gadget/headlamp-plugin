/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/index.tsx":
/*!***********************!*\
  !*** ./src/index.tsx ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _kinvolk_headlamp_plugin_lib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @kinvolk/headlamp-plugin/lib */ \"@kinvolk/headlamp-plugin/lib\");\n/* harmony import */ var _kinvolk_headlamp_plugin_lib__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_kinvolk_headlamp_plugin_lib__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _kinvolk_headlamp_plugin_lib_CommonComponents_SectionBox__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox */ \"@kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox\");\n/* harmony import */ var _kinvolk_headlamp_plugin_lib_CommonComponents_SectionBox__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_kinvolk_headlamp_plugin_lib_CommonComponents_SectionBox__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _kinvolk_headlamp_plugin_lib_CommonComponents_SimpleTable__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable */ \"@kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable\");\n/* harmony import */ var _kinvolk_headlamp_plugin_lib_CommonComponents_SimpleTable__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_kinvolk_headlamp_plugin_lib_CommonComponents_SimpleTable__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! react/jsx-runtime */ \"react/jsx-runtime\");\n/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__);\nfunction _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }\nfunction _nonIterableSpread() { throw new TypeError(\"Invalid attempt to spread non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\"); }\nfunction _iterableToArray(iter) { if (typeof Symbol !== \"undefined\" && iter[Symbol.iterator] != null || iter[\"@@iterator\"] != null) return Array.from(iter); }\nfunction _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }\nfunction _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }\nfunction _nonIterableRest() { throw new TypeError(\"Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.\"); }\nfunction _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === \"string\") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === \"Object\" && o.constructor) n = o.constructor.name; if (n === \"Map\" || n === \"Set\") return Array.from(o); if (n === \"Arguments\" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }\nfunction _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }\nfunction _iterableToArrayLimit(arr, i) { var _i = null == arr ? null : \"undefined\" != typeof Symbol && arr[Symbol.iterator] || arr[\"@@iterator\"]; if (null != _i) { var _s, _e, _x, _r, _arr = [], _n = !0, _d = !1; try { if (_x = (_i = _i.call(arr)).next, 0 === i) { if (Object(_i) !== _i) return; _n = !1; } else for (; !(_n = (_s = _x.call(_i)).done) && (_arr.push(_s.value), _arr.length !== i); _n = !0); } catch (err) { _d = !0, _e = err; } finally { try { if (!_n && null != _i[\"return\"] && (_r = _i[\"return\"](), Object(_r) !== _r)) return; } finally { if (_d) throw _e; } } return _arr; } }\nfunction _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }\n\n\n\n\n\n// Below are some imports you may want to use.\n//   See README.md for links to plugin development documentation.\n// import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';\n// import { K8s } from '@kinvolk/headlamp-plugin/lib/K8s';\n// import { Typography } from '@material-ui/core';\n\nvar websocket = null;\nvar gadgets = {};\nvar listeners = new Map();\nvar id = 0;\nfunction publish(gadgetID, data) {\n  if (listeners.has(gadgetID)) {\n    listeners.get(gadgetID).forEach(function (callback) {\n      return callback(data);\n    });\n  }\n}\nfunction addListener(gadgetID, callback) {\n  console.log('new listener for', gadgetID);\n  if (!listeners.has(gadgetID)) {\n    listeners.set(gadgetID, []);\n  }\n  listeners.get(gadgetID).push(callback);\n}\nfunction removeListener(gadgetID, callback) {\n  console.log('remove listener for', gadgetID);\n  if (listeners.has(gadgetID)) {\n    var channelListeners = listeners.get(gadgetID);\n    var index = channelListeners.indexOf(callback);\n    if (index !== -1) {\n      channelListeners.splice(index, 1);\n    }\n    if (channelListeners.length === 0) {\n      var gadget = gadgets[gadgetID];\n      if (gadget) {\n        websocket.send(JSON.stringify({\n          action: 'stop',\n          payload: {\n            id: gadget.id\n          }\n        }));\n        delete gadgets[gadgetID];\n      }\n      listeners[\"delete\"](gadgetID);\n    }\n  }\n}\nfunction createWebSocketURL() {\n  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';\n  var hostname = window.location.hostname;\n  var port = 4466 || 0;\n  var path = '/proxy/ws?proxyInfo=' + encodeURIComponent('ws://gadget.gadget-rfwlb.gadget.pod.minikube-docker/cmd/?cmd=%5B%22%2Fusr%2Fbin%2Fsocat%22%2C%22%2Frun%2Fgadgetwebservice.socket%22%2C%22-%22%5D');\n  return \"\".concat(protocol, \"//\").concat(hostname).concat(port ? \":\".concat(port) : '').concat(path);\n}\nfunction initWebSocket() {\n  if (!websocket) {\n    var url = createWebSocketURL();\n    console.log('connecting to', url);\n    websocket = new WebSocket(url);\n    websocket.addEventListener('open', function () {\n      console.log('WebSocket connection opened');\n    });\n    websocket.addEventListener('message', function (event) {\n      var data = JSON.parse(event.data);\n      console.log('event', data.id, data.payload);\n      publish(data.id, data.payload);\n    });\n    websocket.addEventListener('close', function () {\n      console.log('WebSocket connection closed');\n      websocket = null; // Set to null to allow re-initialization if needed\n    });\n\n    websocket.addEventListener('error', function (error) {\n      console.error('WebSocket error:', error);\n    });\n  }\n}\nfunction runGadget(gadget) {\n  console.log('running gadget', gadget);\n  gadget.id = '' + ++id;\n  initWebSocket();\n  if (websocket.readyState === WebSocket.OPEN) {\n    websocket.send(JSON.stringify({\n      action: 'start',\n      payload: gadget\n    }));\n  } else {\n    websocket.addEventListener('open', function () {\n      websocket.send(JSON.stringify({\n        action: 'start',\n        payload: gadget\n      }));\n    }, {\n      once: true\n    }); // Automatically remove the event listener after it's called once\n  }\n\n  gadgets[gadget.id] = gadget;\n  return gadget.id;\n}\n(0,_kinvolk_headlamp_plugin_lib__WEBPACK_IMPORTED_MODULE_0__.registerDetailsViewSection)(function (_ref) {\n  var resource = _ref.resource;\n  if (!resource || resource.kind !== 'Pod') return null;\n  var _useState = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)([]),\n    _useState2 = _slicedToArray(_useState, 2),\n    entries = _useState2[0],\n    setEntries = _useState2[1];\n  (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(function () {\n    var id = runGadget({\n      gadgetName: 'socket',\n      gadgetCategory: 'snapshot'\n    });\n    var listenerCallback = function listenerCallback(data) {\n      console.log('got data', data);\n      setEntries(data);\n    };\n    addListener(id, listenerCallback);\n\n    // Clean up the listener when the component is unmounted\n    return function () {\n      removeListener(id, listenerCallback);\n    };\n  }, [resource]);\n  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)((_kinvolk_headlamp_plugin_lib_CommonComponents_SectionBox__WEBPACK_IMPORTED_MODULE_1___default()), {\n    title: \"Sockets\",\n    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)((_kinvolk_headlamp_plugin_lib_CommonComponents_SimpleTable__WEBPACK_IMPORTED_MODULE_3___default()), {\n      columns: [{\n        label: 'Local',\n        getter: function getter(e) {\n          return \"\".concat(e.localAddress, \":\").concat(e.localPort);\n        }\n      }, {\n        label: 'Remote',\n        getter: function getter(e) {\n          return \"\".concat(e.remoteAddress, \":\").concat(e.remotePort);\n        }\n      }, {\n        label: 'Protocol',\n        getter: function getter(e) {\n          return e.protocol;\n        }\n      }, {\n        label: 'Status',\n        getter: function getter(e) {\n          return e.status;\n        }\n      }],\n      data: entries,\n      reflectInURL: \"sockets\"\n    })\n  });\n});\n(0,_kinvolk_headlamp_plugin_lib__WEBPACK_IMPORTED_MODULE_0__.registerDetailsViewSection)(function (_ref2) {\n  var resource = _ref2.resource;\n  if (!resource || resource.kind !== 'Pod') return null;\n  var _useState3 = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)([]),\n    _useState4 = _slicedToArray(_useState3, 2),\n    entries = _useState4[0],\n    setEntries = _useState4[1];\n  (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(function () {\n    var id = runGadget({\n      gadgetName: 'open',\n      gadgetCategory: 'trace'\n    });\n    var listenerCallback = function listenerCallback(data) {\n      console.log('trace open', data);\n      setEntries(function (prev) {\n        return [data].concat(_toConsumableArray(prev.slice(0, 99)));\n      });\n    };\n    addListener(id, listenerCallback);\n\n    // Clean up the listener when the component is unmounted\n    return function () {\n      removeListener(id, listenerCallback);\n    };\n  }, [resource]);\n  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)((_kinvolk_headlamp_plugin_lib_CommonComponents_SectionBox__WEBPACK_IMPORTED_MODULE_1___default()), {\n    title: \"Open File Events\",\n    children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_4__.jsx)((_kinvolk_headlamp_plugin_lib_CommonComponents_SimpleTable__WEBPACK_IMPORTED_MODULE_3___default()), {\n      columns: [{\n        label: 'Command',\n        getter: function getter(e) {\n          return e.comm;\n        }\n      }, {\n        label: 'Path',\n        getter: function getter(e) {\n          return e.path;\n        }\n      }, {\n        label: 'fd',\n        getter: function getter(e) {\n          return e.fd;\n        }\n      }, {\n        label: 'Ret',\n        getter: function getter(e) {\n          return e.ret;\n        }\n      }],\n      data: entries,\n      reflectInURL: \"files\"\n    })\n  });\n});\n\n//# sourceURL=webpack://headlamp-ig/./src/index.tsx?");

/***/ }),

/***/ "@kinvolk/headlamp-plugin/lib":
/*!****************************!*\
  !*** external "pluginLib" ***!
  \****************************/
/***/ ((module) => {

module.exports = pluginLib;

/***/ }),

/***/ "@kinvolk/headlamp-plugin/lib/CommonComponents/SectionBox":
/*!*************************************************************!*\
  !*** external "pluginLib.CommonComponents[\"SectionBox\"]" ***!
  \*************************************************************/
/***/ ((module) => {

module.exports = pluginLib.CommonComponents["SectionBox"];

/***/ }),

/***/ "@kinvolk/headlamp-plugin/lib/CommonComponents/SimpleTable":
/*!**************************************************************!*\
  !*** external "pluginLib.CommonComponents[\"SimpleTable\"]" ***!
  \**************************************************************/
/***/ ((module) => {

module.exports = pluginLib.CommonComponents["SimpleTable"];

/***/ }),

/***/ "react":
/*!**********************************!*\
  !*** external "pluginLib.React" ***!
  \**********************************/
/***/ ((module) => {

module.exports = pluginLib.React;

/***/ }),

/***/ "react/jsx-runtime":
/*!*************************************!*\
  !*** external "pluginLib.ReactJSX" ***!
  \*************************************/
/***/ ((module) => {

module.exports = pluginLib.ReactJSX;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.tsx");
/******/ 	
/******/ })()
;