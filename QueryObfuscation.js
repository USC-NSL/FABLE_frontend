//queryobfuscation.js
// Function to connect to the MongoDB database
async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");
        return client.db(dbName).collection(collectionName);
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
}

async function searchMappingsByRoot(rootUrl) {
    const root = new URL(rootUrl).origin;

    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['mappings'], function(result) {
            if (!result.mappings) {
                reject('No mappings stored locally.');
            } else {
                // Filter the mappings by root
                const filteredMappings = result.mappings.filter(mapping => new URL(mapping.url).origin === root);
                resolve(filteredMappings);
            }
        });
    });
}

function obfuscateViaPair(url1, url2) {
    if (!url1 || !url2) {
        console.error('One or both URLs not provided for obfuscation');
        return { obfuscated1: null, obfuscated2: null, map: {} };
    }

    // Pre-process URLs to replace protocols
    let obfuscated1 = url1;
    let obfuscated2 = url2;
    const protocolMap = {};
    const protocols = ['https', 'http']; // Add more protocols if needed
    protocols.forEach(protocol => {
        if (url1.startsWith(protocol + "://")) {
            protocolMap[protocol] = 'a'; // Assuming 'a' is the starting char for mapping
            obfuscated1 = obfuscated1.replace(protocol + "://", 'a://');
            obfuscated2 = obfuscated2.replace(protocol + "://", 'a://');
        }
    });

    const regex = /[a-z\d]+/ig;
    const parts1 = url1.split(/[_\/\.\?&=]+/).flatMap(part => part.match(regex) || []);
    const parts2 = url2.split(/[_\/\.\?&=]+/).flatMap(part => part.match(regex) || []);
    const combinedParts = Array.from(new Set([...parts1, ...parts2]));

    const map = { ...protocolMap };
    let charCode = 'a'.charCodeAt(0); // Start from 'b' if 'a' is used for protocols

    combinedParts.forEach(part => {
        if (!Object.values(map).includes(part)) {
            const char = '|' + String.fromCharCode(charCode) + '|'; // Delimiter added
            map[char] = part;
            const partPattern = part.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'); //add ampersand, unique strings
            const regexPattern = new RegExp(`(?<=[_\/\.\?&=]|^)(${partPattern})(?=[_\/\.\?&=]|$)`, 'g');

            obfuscated1 = obfuscated1.replace(regexPattern, char);
            obfuscated2 = obfuscated2.replace(regexPattern, char);

            charCode++;
        }
    });

    // Post-process to reapply protocol obfuscation if necessary
    // This step may be adjusted based on how protocols are handled in initial obfuscation
    protocols.forEach(protocol => {
        if (protocolMap[protocol]) {
            obfuscated1 = obfuscated1.replace('a://', protocolMap[protocol] + '://');
            obfuscated2 = obfuscated2.replace('a://', protocolMap[protocol] + '://');
        }
    });

    return { obfuscated1, obfuscated2, map };
}

function obfuscateExistingMappings(existingMappings) {
    const obfuscatedExistingMappings = [];

    for (let i = 0; i < existingMappings.length; i++) {
        console.error('obfuscating mapping', i + 1, 'of', existingMappings.length);
        console.error('old ', existingMappings[i]);



        const { old: oldMapping, new: newMapping } = existingMappings[i];
        
        // Use obfuscateViaPair to obfuscate old and new mappings together
        const { obfuscated1: obfuscatedOld, obfuscated2: obfuscatedNew, map } = obfuscateViaPair(oldMapping, newMapping);

        // Add the result to the obfuscatedExistingMappings array
        obfuscatedExistingMappings.push({ old: obfuscatedOld, new: obfuscatedNew, map });
        console.error('to ', obfuscatedOld, obfuscatedNew);

    }

    return obfuscatedExistingMappings;
}



// right now it only does the first, i want all?
// Helper function to deobfuscate the URL
function deobfuscate(obfuscated, map) {
    console.log('Starting deobfuscation process...');

    console.log(map);

    // console.log(`obfuscated URL: ${obfuscated}`);

    let deobfuscated = obfuscated;
    for (const key in map) {
        console.log(`Replacing ${key} with ${map[key]}`);
        let keyPosition = deobfuscated.indexOf(key);
        while (keyPosition !== -1) {
            console.log(`Found the key '${key}' at position ${keyPosition}`);
            deobfuscated = deobfuscated.replace(key, map[key]);
            // console.log(`Current state of URL: ${deobfuscated}`);
            keyPosition = deobfuscated.indexOf(key); // Update key position for the next iteration
        }
    }

    console.log(`deobfuscated URL: ${deobfuscated}`);
    return deobfuscated;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "transformUrl") {
        console.error('does this ever get called?'); //NO!
        // Assume `obfuscateUrl` is a function within QueryObfuscation.js that does the actual work
        obfuscateUrl(request.url).then(transformedUrl => {
            sendResponse({transformedUrl: transformedUrl});
        }).catch(error => {
            sendResponse({error: error.message});
        });
        return true; // Indicates an asynchronous response is expected
    }
});

// Example obfuscateUrl function, which should be replaced with your actual logic
// async function obfuscateUrl(url) {
//     // Your obfuscation logic here, possibly involving async operations
//     // For demonstration, we'll just prepend "Obfuscated_" to the URL
//     return "Obfuscated_" + url;
// }



main();
