/**
 * CloudFront function to redirect incoming requests to their corresponding S3 file.
 */
function handler(event) {
    // Const and var are not supported
    var request = event.request;
    var uri = request.uri;

    // The main entry point
    if (uri === '/') {
        request.uri = '/index.html';
        return request;
    }

    // The path suffixes that shall redirect to the main entry point
    var indexPathAliases = ['/', '/index.html']
    for (var i = 0; i < indexPathAliases.length; i++) {
        var alias = indexPathAliases[i];
        if (uri.endsWith(alias)) {
            var host = request.headers.host.value;

            return {
                statusCode: 301,
                statusDescription: 'Moved Permanently',
                headers:
                    { "location": { "value": `https://${host}${uri.slice(0, -alias.length)}` } }
            }
        }
    }

    // When the URI is missing a file extension, we assume the main entry file (index.html) for the current path is requested
    if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
}