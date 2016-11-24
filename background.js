var requestSent = {},
    outputString = "",
    isCapturing = false,
    idleIconPath = './icon.png',
    recordingIconPath = './icon-rec.png';

function resetSession() {
    requestSent = {};
    outputString = "";
}

function toggle(currentTab) {
    var target = {
        tabId: currentTab.id
    };

    if (!isCapturing) {
        startCapturing(target);
    } else {
        stopCapturing(target);
        exportSession();
    }
    resetSession();

    isCapturing = !isCapturing;
}
chrome.browserAction.onClicked.addListener(toggle);

function startCapturing(target) {
    chrome.debugger.attach(target, "1.0");
    chrome.debugger.sendCommand(target, "Network.enable");
    chrome.debugger.onEvent.addListener(onDebuggerEvent);
    chrome.browserAction.setIcon({ path: recordingIconPath });
}

function stopCapturing(target) {
    chrome.debugger.detach(target);
    chrome.browserAction.setIcon({ path: idleIconPath });
}

function onDebuggerEvent(debugee, message, params) {
    if (message == "Network.requestWillBeSent" && params.type == "XHR") {
        requestSent[params.requestId] = params.request;

    } else if (message == "Network.responseReceived" && params.type == "XHR") {

        chrome.debugger.sendCommand(debugee, "Network.getResponseBody", params, function(responseBody) {
            params.response.base64Encoded = responseBody.base64Encoded;
            params.response.body = responseBody.body;

            var request = requestSent[params.requestId];
            outputString += serializeRequestToText(request, params.response);
        });
    }
}

function serializeRequestToText(request, response) {
    return response.requestHeadersText 
        + (request.postData || "") + "\r\n\r\n" 
        + response.headersText 
        + (response.body || "") + "\r\n\r\n";
}

function exportSession() {
    var blob = new Blob([outputString], {
        type: "text/plain;charset=utf-8"
    });

    var fileNameSuffix = new Date().toISOString().replace(/:/g, "-");
    saveAs(blob, "SessionTraces" + fileNameSuffix + ".txt");
}
