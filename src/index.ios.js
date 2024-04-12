import React from 'react';
import ReactDOM from 'react-dom';
import { IntlProvider } from 'react-intl';

import Editor from './ui/editor';
import EditorCore from './core/editor-core';
import strings from './en-us.strings';

let currentInstance = null;

class EditorInstance {
	constructor(options) {
		window._currentEditorInstance = this;
		this.instanceID = options.instanceID;
		this._readOnly = options.readOnly;
		this._localizedStrings = options.localizedStrings;
		this._editorCore = null;
		window.localizedStrings = options.localizedStrings;

		this._init(options.value);
	}

	_getLocalizedString(key) {
		let string = this._localizedStrings[key];
		return string || key;
	}

	_postMessage(message) {
		window.webkit.messageHandlers.messageHandler.postMessage(message);
	}

	_init(value) {
		this._editorCore = new EditorCore({
			value,
			mode: 'ios',
			readOnly: this._readOnly,
			unsaved: false,
			placeholder: '',
			isAttachmentNote: false,
			onSubscribe: (subscription) => {
				let { id, type, data } = subscription;
				subscription = { id, type, data };
				this._postMessage({ action: 'subscribe', subscription });
			},
			onUnsubscribe: (subscription) => {
				let { id, type } = subscription;
				this._postMessage({ action: 'unsubscribe', id, type });
			},
			onImportImages: (images) => {
				// this._postMessage({ action: 'importImages', images });
			},
			onUpdate: () => {
				let data = this._editorCore.getData();
				if (data) {
					this._postMessage({ action: 'update', value: data.html });
				}
			},
			onInsertObject: (type, data, pos) => {
				// this._postMessage({ action: 'insertObject', type, data, pos });
			},
			onUpdateCitationItemsList: (list) => {
				// this._postMessage({ action: 'updateCitationItemsList', list });
			},
			onOpenURL: (url) => {
				this._postMessage({ action: 'openURL', url });
			},
			onOpenAnnotation: (annotation) => {
				this._postMessage({
					action: 'openAnnotation',
					attachmentURI: annotation.attachmentURI,
					position: annotation.position
				});
			},
			onOpenCitationPage: (citation) => {
				this._postMessage({ action: 'openCitationPage', citation });
			},
			onShowCitationItem: (citation) => {
				this._postMessage({ action: 'showCitationItem', citation });
			},
			onOpenCitationPopup: (nodeID, citation) => {
				// this._postMessage({ action: 'openCitationPopup', nodeID, citation });
			},
			onOpenContextMenu: (pos, node, x, y) => {
				// this._postMessage({ action: 'openContextMenu', x, y, pos, itemGroups: this._getContextMenuItemGroups(node) });
			}
		});

		if (this._editorCore.unsupportedSchema) {
			this._readOnly = true;
		}

		ReactDOM.render(
			<IntlProvider
				locale={window.navigator.language}
				messages={strings}
			>
				<Editor
					readOnly={this._readOnly}
					disableUI={false}
					enableReturnButton={false}
					viewMode="ios"
					showUpdateNotice={this._editorCore.unsupportedSchema}
					editorCore={this._editorCore}
					onClickReturn={() => {
					}}
					onShowNote={() => {
						this._postMessage({ action: 'showNote' });
					}}
					onOpenWindow={() => {

					}}
				/>
			</IntlProvider>,
			document.getElementById('editor-container')
		);
		this._postMessage({ action: 'readerInitialized' });
	}

	uninit() {
		window.removeEventListener('message', this._messageHandler);
		ReactDOM.unmountComponentAtNode(document.getElementById('editor-container'));
	}
}

// Prevent zoom on double-tap
document.addEventListener('dblclick', function(event) {
	event.preventDefault();
}, { passive: false });

document.addEventListener('selectionchange', () => {
	const selection = window.getSelection();
	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		// Get the parent element of the cursor's position
		const parentElement = range.commonAncestorContainer.nodeType === 3
			? range.commonAncestorContainer.parentNode
			: range.commonAncestorContainer;
		setTimeout(() => {
			parentElement.scrollIntoView();
		}, 50);
	}
});

document.addEventListener('click', () => {
	const selection = window.getSelection();
	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		// Get the parent element of the cursor's position
		const parentElement = range.commonAncestorContainer.nodeType === 3
			? range.commonAncestorContainer.parentNode
			: range.commonAncestorContainer;
		setTimeout(() => {
			parentElement.scrollIntoView();
		}, 1000);
	}
});

// _messageHandler = (event) => {
// 		if (event.data.instanceID !== this.instanceID) {
// 			return;
// 		}
// 		let message = event.data.message;
// 		switch (message.action) {
// 			case 'notifySubscription': {
// 				let { id, data } = message;
// 				this._editorCore.provider.notify(id, data);
// 				return;
// 			}
// 			// case 'setCitation': {
// 			// 	let { nodeID, citation, formattedCitation } = message;
// 			// 	this._editorCore.setCitation(nodeID, citation, formattedCitation);
// 			// 	return;
// 			// }
// 			// case 'updateCitationItems': {
// 			// 	let { citationItems } = message;
// 			// 	this._editorCore.updateCitationItems(citationItems);
// 			// 	return;
// 			// }
// 			// case 'attachImportedImage': {
// 			// 	let { nodeID, attachmentKey } = message;
// 			// 	this._editorCore.attachImportedImage(nodeID, attachmentKey);
// 			// 	return;
// 			// }
// 			// case 'insertHTML': {
// 			// 	let { pos, html } = message;
// 			// 	this._editorCore.insertHTML(pos, html);
// 			// 	return;
// 			// }
// 		}
// 	}

window.notifySubscription = encodedMessage => {
	let message = JSON.parse(decodeBase64(encodedMessage));
	let { id, data } = message;
	currentInstance._editorCore.provider.notify(id, data);
}

window.start = encodedMessage => {
	let message = JSON.parse(decodeBase64(encodedMessage));
	if (currentInstance) {
		currentInstance.uninit();
	}
	currentInstance = new EditorInstance({ instanceID: 1, ...message });
}

function decodeBase64(base64) {
     const text = atob(base64);
     const length = text.length;
     const bytes = new Uint8Array(length);
     for (let i = 0; i < length; i++) {
         bytes[i] = text.charCodeAt(i);
     }
     const decoder = new TextDecoder();
     return decoder.decode(bytes);
 }

 function log(message) {
	window.webkit.messageHandlers.logHandler.postMessage(message); 	
 }


window.webkit.messageHandlers.messageHandler.postMessage({ action: 'initialized' });
