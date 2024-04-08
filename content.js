const enableSavedTransformationSearch = true;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.url && !request.cache) {
        doTransform(request.url).then(transformedUrl => {
            sendResponse({ transformedUrl: transformedUrl });
        }).catch(error => {
            sendResponse({ error: 'Transformation failed due to an error.' });
        });
        return true;
    } else if (request.cache && !request.all) {
        searchMappingsByRoot(request.url).then(existingMappings => {
            sendResponse({ cache: existingMappings });
        }).catch(error => {
            sendResponse({ cache: 'Error retrieving mappings' });
        });
        return true;
    }
});

function doTransform(url) {
    console.log('Starting transformation for URL:', url);
    return new Promise((resolve, reject) => {
        searchMappingsByRoot(url).then(existingMappings => {
            if (enableSavedTransformationSearch) {
                const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
                console.error('Debug: Checking for exact match in existing mappings');
                const exactMatch = existingMappings.find(mapping => mapping.old.replace(/^https?:\/\//, '') === urlWithoutProtocol);
                if (exactMatch) {
                    console.log('Exact match found. Skipping GPT transformation.');
                    resolve(exactMatch.new);
                    return;
                } else {
                    console.log('No exact match found for ' + urlWithoutProtocol + '. Proceeding with GPT transformation.');
                }
            }

            if (existingMappings.length === 0) {
                console.log('No mappings found for the given root. Ending process.');
                resolve(null);
                return;
            }

            const { obfuscated, map } = obfuscate(url);
            const obfuscatedExistingMappings = obfuscateExistingMappings(existingMappings);

            transformUrlViaGPT(obfuscated, obfuscatedExistingMappings).then(transformedObfuscatedUrl => {
                const retUrl = deobfuscate(transformedObfuscatedUrl, map);
                resolve(retUrl);
            }).catch(error => {
                reject(error); 
            });
        }).catch(error => {
            reject(error);
        });
    });
}

function deobfuscate(obfuscated, map) {
    console.log('Starting deobfuscation process...');

    console.log(map);

    let deobfuscated = obfuscated;
    for (const key in map) {
        console.log(`Replacing ${key} with ${map[key]}`);
        let keyPosition = deobfuscated.indexOf(key);
        while (keyPosition !== -1) {
            console.log(`Found the key '${key}' at position ${keyPosition}`);
            deobfuscated = deobfuscated.replace(key, map[key]);
            keyPosition = deobfuscated.indexOf(key); 
        }
    }

    console.log(`deobfuscated URL: ${deobfuscated}`);
    return deobfuscated;
}


async function searchMappingsByRoot(rootUrl) {
    try {
        console.error('Debug: Starting searchMappingsByRoot for rootUrl', rootUrl);
        const root = new URL(rootUrl).hostname;

        let currentPath = new URL(rootUrl).pathname;
        if (currentPath === '/') currentPath = '';

        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['mappings'], function(result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (!result.mappings || result.mappings.length === 0) {
                    reject('No mappings stored locally.');
                } else {
                    let lastSuccessfulMappings = [];
                    for (let i = 1; i <= currentPath.length; i++) {
                        const filteredMappings = [];
                        const partialPath = currentPath.slice(0, i);

                        result.mappings.forEach(mapping => { //line 206
                            mapping.urlPairs.forEach(pair => { //line 207
                                if (pair.old.includes(root + partialPath)) { 
                                    filteredMappings.push({
                                        old: pair.old,
                                        new: pair.new
                                    });
                                } 
                            });
                        });
                        if (filteredMappings.length < 2) { 
                            break;
                        } else {
                            lastSuccessfulMappings = filteredMappings;
                        }
                    }
                    resolve(lastSuccessfulMappings);
                }
            });
        });
        return result;
    } catch (error) {
        throw error;
    }
}

    async function searchMappingsAll() {
        try {
            const result = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['mappings'], function(result) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else if (!result.mappings || result.mappings.length === 0) {
                        reject('No mappings stored locally.');
                    } else {
                        const allMappings = [];
                        result.mappings.forEach(mapping => {
                            mapping.urlPairs.forEach(pair => {
                                allMappings.push({
                                    old: pair.old,
                                    new: pair.new
                                });
                            });
                        });
                        resolve(allMappings);
                    }
                });
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
    
    


    function obfuscate(url) {
        if (!url) { 
            return { obfuscated: null, map: {} };
        }

        let obfuscated = url;

        const regex = /[:/._=?-]+/;
        const parts = url.split(regex).filter(part => part);
    
        const map = {};
        let charCode = 'a'.charCodeAt(0);
    
        parts.forEach(part => {
            if (!map.hasOwnProperty(part)) {
                const char = '|' + String.fromCharCode(charCode) + '|';
                map[char] = part;
    
                obfuscated = obfuscated.replace(part, () => {
                    charCode++;
                    return char;
                });
            }
        });
    
        return { obfuscated, map };
    }
    
function obfuscateExistingMappings(existingMappings) {
    const obfuscatedExistingMappings = [];
    for (let i = 0; i < existingMappings.length; i++) {
        const { old: oldMapping, new: newMapping } = existingMappings[i];
        const { obfuscated1: obfuscatedFrom, obfuscated2: obfuscatedTo, map } = obfuscateViaPair(oldMapping, newMapping);
        obfuscatedExistingMappings.push({ old: obfuscatedFrom, new: obfuscatedTo, map });
    }
    return obfuscatedExistingMappings;
}

function obfuscateViaPair(url1, url2) {
    if (!url1 || !url2) {
        return { obfuscated1: null, obfuscated2: null, map: {} };
    }

    let obfuscated1 = url1;
    let obfuscated2 = url2;
    const regex = /[:/.=?-]+/;
    const parts1 = url1.split(regex).filter(part => part); 
    const parts2 = url2.split(regex).filter(part => part); 

    const map = {};
    let charCode = 'a'.charCodeAt(0);

    parts1.forEach(part => {
        if (!map.hasOwnProperty(part)) {
            const char = '|' + String.fromCharCode(charCode) + '|';
            map[part] = char;
            const partPattern = part.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
            const regexPattern = new RegExp(`(${partPattern})(?=[/:/.=?-]|$)`, 'g');

            obfuscated1 = obfuscated1.replace(regexPattern, map[part]);

            charCode++;
        }
    });

    parts2.forEach(part => {
        if (parts1.includes(part)) {
            if (!map.hasOwnProperty(part)) {
                const char = '|' + String.fromCharCode(charCode) + '|';
                map[part] = char;
                charCode++;
            }
        } else {
            map[part] = part;
        }
        const partPattern = part.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
        const regexPattern = new RegExp(`(${partPattern})(?=[/:/.=?-]|$)`, 'g');
        obfuscated2 = obfuscated2.replace(regexPattern, map[part]);
    });

    return {
        obfuscated1,
        obfuscated2,
        map
    };
}


async function transformUrlViaGPT(obfuscatedUrl, obfuscatedExistingMappings) {

    try {
        const systemMessage = "You are a 'pattern recognizer', a skilled entity at identifying patterns in URL transformations. Your task is to analyze the provided examples of URL mappings to understand common transformation patterns. Based on these patterns, predict the transformation for a new URL. Respond with the transformed URL only.";

        let simulatedConversation = [];
        obfuscatedExistingMappings.slice(0, 5).forEach(mapping => {
            simulatedConversation.push(
                { "role": "user", "content": `Transform ${mapping.old}` },
                { "role": "assistant", "content": `${mapping.new}` }
            );
        });

        simulatedConversation.push({ "role": "user", "content": `Transform ${obfuscatedUrl}` });

        const messages = [
            { "role": "system", "content": systemMessage },
            ...simulatedConversation
        ];
                
        const response = await fetch('https://fable-backend-heroku-ee435cd7c45a.herokuapp.com/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify( messages )
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.choices && data.choices.length > 0) {
            const transformedUrl = data.choices[0].message.content.trim();
            return transformedUrl;
        } else {
            throw new Error('Invalid response structure from OpenAI API');
        }
    } catch (error) {
        return null;
    }
}

async function getAllMappings() {
    try {

        const response = await fetch('https://fable-backend-heroku-ee435cd7c45a.herokuapp.com/mongodb', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return [];
        }

        chrome.storage.local.set({ mappings: data }, () => {
            console.log('All mappings stored locally.');
        });

        return data;
    } catch (error) {
        return [];
    }
}



function initializeContentScript() {
    window.isContentScriptReady = true;
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
}

initializeContentScript();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayPopup' && message.URL) {
        console.log('got message to dsiplay popup AND url is ', message.URL);
        doTransform(message.URL).then(transformedUrl => {
            displayPopup(transformedUrl);
        }).catch(error => {
            console.error('Error in doTransform:', error);        });
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'getAllMappings' && message.URL) {
        getAllMappings();
    }
});

function displayPopup(transformedUrl) {
    console.log("Content Script: Displaying popup");

    if (!document.getElementById('popup-container')) {
        const popupContainer = document.createElement('div');
        popupContainer.id = "popup-container";

        popupContainer.innerHTML = `
            <div id="title-txt" style="position: relative; padding: 10px; background-color: #e51d21; color: white; border-radius: 5px 5px 0 0; overflow: hidden;">
                404: Not Found
                <span id="close-btn" style="cursor: pointer; position: absolute; top: 50%; transform: translateY(-50%); right: 10px; font-size: 1em; color: white;">✕</span>
            </div>
            <div style="padding: 10px; text-align: center;">
            <img src="${chrome.runtime.getURL('brokenlink.png')}" style="width: 185px; height: 82px;">
            <div style="font-size: 14px; margin-top: 10px;"><b>Sorry, this link is broken.</b><br> Do you want to check for a fixed link using FABLE?</div>
                <a href="${transformedUrl}" id="archive-btn">Go to fixed link</a>
            </div>
        `;

        Object.assign(popupContainer.style, {
            position: 'fixed',
            zIndex: '2147483647',
            width: '350px',
            top: '10px',
            right: '10px',
            backgroundColor: 'white',
            borderRadius: '5px',
            boxShadow: '0 3px 5px 0 rgba(0,0,0,.3)',
            fontFamily: `'Arial', sans-serif`,
            fontSize: '12pt',
            animation: 'fadein 0.8s ease-out'
        });

        const closeButton = popupContainer.querySelector('#close-btn');
        closeButton.addEventListener("click", function() {
            document.body.removeChild(popupContainer);
        });

        const archiveButton = popupContainer.querySelector('#archive-btn');
        Object.assign(archiveButton.style, {
            display: 'inline-block',
            backgroundColor: '#e51d21',
            color: 'white',
            textDecoration: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            marginTop: '10px'
        });

        document.body.appendChild(popupContainer);
    }
}
