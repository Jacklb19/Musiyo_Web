function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.indexOf('/api/') === 0 || uri.indexOf('/unity/') === 0 || uri.indexOf('/assets/') === 0) {
        return request;
    }
    var last = uri.substring(uri.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) {
        request.uri = '/index.html';
    }
    return request;
}
