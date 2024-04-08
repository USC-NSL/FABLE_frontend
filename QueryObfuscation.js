
function obfuscateViaPair(url1, url2) {
    if (!url1 || !url2) {
        return { obfuscated1: null, obfuscated2: null, map: {} };
    }

    let obfuscated1 = url1;
    let obfuscated2 = url2;
    const protocolMap = {};
    const protocols = ['https', 'http']; 
    protocols.forEach(protocol => {
        if (url1.startsWith(protocol + "://")) {
            protocolMap[protocol] = 'a'; 
            obfuscated1 = obfuscated1.replace(protocol + "://", 'a://');
            obfuscated2 = obfuscated2.replace(protocol + "://", 'a://');
        }
    });

    const regex = /[a-z\d]+/ig;
    const parts1 = url1.split(/[_\/\.\?&=]+/).flatMap(part => part.match(regex) || []);
    const parts2 = url2.split(/[_\/\.\?&=]+/).flatMap(part => part.match(regex) || []);
    const combinedParts = Array.from(new Set([...parts1, ...parts2]));

    const map = { ...protocolMap };
    let charCode = 'a'.charCodeAt(0);

    combinedParts.forEach(part => {
        if (!Object.values(map).includes(part)) {
            const char = '|' + String.fromCharCode(charCode) + '|';
            map[char] = part;
            const partPattern = part.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            const regexPattern = new RegExp(`(?<=[_\/\.\?&=]|^)(${partPattern})(?=[_\/\.\?&=]|$)`, 'g');

            obfuscated1 = obfuscated1.replace(regexPattern, char);
            obfuscated2 = obfuscated2.replace(regexPattern, char);

            charCode++;
        }
    });

    protocols.forEach(protocol => {
        if (protocolMap[protocol]) {
            obfuscated1 = obfuscated1.replace('a://', protocolMap[protocol] + '://');
            obfuscated2 = obfuscated2.replace('a://', protocolMap[protocol] + '://');
        }
    });

    return { obfuscated1, obfuscated2, map };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "transformUrl") {
        obfuscateUrl(request.url).then(transformedUrl => {
            sendResponse({transformedUrl: transformedUrl});
        }).catch(error => {
            sendResponse({error: error.message});
        });
        return true; 
    }
});

main();
