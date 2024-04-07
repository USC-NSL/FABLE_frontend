const enableSavedTransformationSearch = false;
//toggle whether or not it will directly look up transformation that have already been found

//background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.url && !request.cache) {

        // Handle URL transformation asynchronously.
        doTransform(request.url).then(transformedUrl => {
            //             const transformedUrl = deobfuscate(transformedobfuscatedUrl, map);

            sendResponse({ transformedUrl: transformedUrl });
        }).catch(error => {
            console.error('Error in doTransform:', error);
            sendResponse({ error: 'Transformation failed due to an error.' });
        });
        // Signal Chrome to wait for asynchronous response.
        return true;
    } else if (request.cache && !request.all) {
        // Synchronously send cache response.
        searchMappingsByRoot(request.url).then(existingMappings => {
            // console.error('Existing mappings retrieved:', JSON.stringify(existingMappings));
            sendResponse({ cache: existingMappings });
        }).catch(error => {
            console.error('Error retrieving mappings:', error);
            sendResponse({ cache: 'Error retrieving mappings' });
        });
        return true;

    } else if (request.cache && request.all) {
        searchMappingsAll().then(allMappings => {
            // console.error('Existing mappings retrieved:', JSON.stringify(allMappings));
            sendResponse({ cache: allMappings });
        }).catch(error => {
            console.error('Error retrieving mappings:', error);
            sendResponse({ cache: 'Error retrieving mappings' });
        });
        return true;
     } else if (request.pull) {
        console.error('request pull');
            getAllMappings().then(allMappings => {
                // console.error('Existing mappings retrieved:', JSON.stringify(allMappings));
                sendResponse({ cache: allMappings });
            }).catch(error => {
                console.error('Error retrieving mappings:', error);
                sendResponse({ cache: 'Error retrieving mappings' });
            });
            return true; // Signal Chrome to wait for asynchronous response.
        } else {
        sendResponse({ error: 'Invalid request' });
    }
    // No need to return true here as it's already covered above.
});

// Function to add mappings to the Chrome storage
function addMappingsToStorage(mappings) {
    chrome.storage.local.get(['mappings'], function(result) {
        let currentMappings = result.mappings || [];
        // Filter out mappings that already exist
        const newMappings = mappings.filter(mapping => 
            !currentMappings.some(existingMapping => 
                existingMapping.old === mapping.old && existingMapping.new === mapping.new));

        // Combine the current mappings with the new, unique ones
        const updatedMappings = currentMappings.concat(newMappings);

        // Store the updated mappings
        chrome.storage.local.set({mappings: updatedMappings}, function() {
            if (chrome.runtime.lastError) {
                console.error('Error adding mappings to storage:', chrome.runtime.lastError);
            } else {
                console.log('Mappings added successfully');
            }
        });
    });
}

function clearMappingsFromStorage() {
    chrome.storage.local.remove('mappings', function() {
        if (chrome.runtime.lastError) {
            console.error('Error clearing mappings from storage:', chrome.runtime.lastError);
        } else {
            console.log('Mappings cleared successfully');
        }
    });
}

function clearSpecificMappingsFromStorage(searchString) {
    // Retrieve the current mappings from storage
    chrome.storage.local.get('mappings', function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error retrieving mappings from storage:', chrome.runtime.lastError);
            return;
        }

        // Check if mappings exist and filter them
        var mappings = data.mappings;
        if (mappings) {
            // Filter out mappings that contain the searchString in either the 'from' or 'to' properties
            var filteredMappings = mappings.filter(function(mapping) {
                // Check both 'from' and 'to' properties for the searchString
                return !mapping.old.includes(searchString) && !mapping.new.includes(searchString);
            });

            // Update the storage with the filtered mappings
            chrome.storage.local.set({'mappings': filteredMappings}, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error updating mappings in storage:', chrome.runtime.lastError);
                } else {
                    console.log('Specific mappings cleared successfully');
                }
            });
        } else {
            console.log('No mappings to clear');
        }
    });
}

function doTransform(url) {
    console.log('Starting transformation for URL:', url);
    return new Promise((resolve, reject) => {
        // getAllMappings().then(allMappings => {
            searchMappingsByRoot(url).then(existingMappings => {
                console.error('Existing mappings retrieved:', existingMappings.length);
    
                if (enableSavedTransformationSearch) {
                    // Check for an exact match in the existing mappings
                    const exactMatch = existingMappings.find(mapping => mapping.old === url);
                    if (exactMatch) {
                        console.log('Exact match found. Skipping GPT transformation.');
                        resolve(exactMatch.new);
                        return;
                    }
                }
    
                if (existingMappings.length === 0) {
                    console.log('No mappings found for the given root. Ending process.');
                    resolve(null); // Indicate no transformation occurred due to no mappings
                    return;
                }
    
                const { obfuscated, map } = obfuscate(url);
                console.error('URL obfuscated:', obfuscated);
    
                const obfuscatedExistingMappings = obfuscateExistingMappings(existingMappings);
                console.error(' map for solo url', JSON.stringify(map, null, 2));
    
                // Here, use .then() instead of await
                transformUrlViaGPT(obfuscated, obfuscatedExistingMappings).then(transformedObfuscatedUrl => {
                    console.error(` dT Transformed URL received: ${transformedObfuscatedUrl}`);
                    const retUrl = deobfuscate(transformedObfuscatedUrl, map);
                    resolve(retUrl);
                }).catch(error => {
                    console.error('Transformation error:', error);
                    reject(error); // Reject the promise on error
                });
            }).catch(error => {
                console.error('Error retrieving mappings:', error);
                reject(error);
            });
        }).catch(error => {
            console.error('Error retrieving mappings:', error);
            reject(error);
        });

    // });
}

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


async function searchMappingsByRoot(rootUrl) {
    try {
        console.error('Debug: Starting searchMappingsByRoot for rootUrl', rootUrl); // Debug message for root URL
        const root = new URL(rootUrl).hostname;
        console.error('Debug: root origin identified as', root); // Debug message for root origin

        let currentPath = new URL(rootUrl).pathname; // Get the path part of the URL
        if (currentPath === '/') currentPath = ''; // Ignore the root path

        console.error('Debug: initial currentPath set to', currentPath); // Debug message for initial path

        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['mappings'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Debug: runtime error in chrome.storage.local.get', chrome.runtime.lastError); // Debug message for storage error
                    reject(chrome.runtime.lastError);
                } else if (!result.mappings || result.mappings.length === 0) {
                    console.error('Debug: No mappings found in storage'); // Debug message when no mappings are found
                    reject('No mappings stored locally.');
                } else {
                    let lastSuccessfulMappings = [];
                    for (let i = 1; i <= currentPath.length; i++) {
                        const filteredMappings = [];
                        const partialPath = currentPath.slice(0, i);
                        // console.error('Debug: Trying partialPath', partialPath); // Debug message for current partial path
                        // console.error('Debug: Trying jkasdnkjn', result.mappings); // Debug message for current partial path

                        result.mappings.forEach(mapping => { //line 206
                            mapping.urlPairs.forEach(pair => { //line 207
                                // console.error('pair'); // Debug message for a found mapping
                                console.error('does' + pair.old + 'include' + (root + partialPath) + '?'); // Debug message for backtracking
                                if (pair.old.includes(root + partialPath)) { //line 208
                                    console.error('yesssss!!!'); // Debug message for backtracking
                                    filteredMappings.push({
                                        old: pair.old,
                                        new: pair.new
                                    });
                                    // console.error('Debug: Mapping found for partialPath', partialPath, 'Mapping:', pair); // Debug message for a found mapping
                                } else {
                                    // console.error(pair.old, " ", root, " ", root + partialPath); // Debug message for a found mapping
                                }
                            });
                        });
                        if (filteredMappings.length < 2) { // Changed from === 0 to < 2
                            console.error('Debug: Less than 2 mappings found for partialPath', partialPath, ' - Backtracking'); // Debug message for backtracking
                            break; // Exit the loop if fewer than two mappings match the increasingly specific path
                        } else {
                            lastSuccessfulMappings = filteredMappings;
                            console.error('Debug: Successful mappings updated for partialPath', partialPath); // Debug message for successful mapping update
                        }
                    }
                    resolve(lastSuccessfulMappings);
                }
            });
        });
        console.error('Debug: Final mappings result', result); // Debug message before returning result
        return result;
    } catch (error) {
        console.error('Failed to search mappings by root selectively:', error);
        throw error; // Rethrow the error to be caught by the caller
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
            console.error('Failed to search all mappings:', error);
            throw error; // Rethrow the error to be caught by the caller
        }
    }
    
    


    function obfuscate(url) {
        if (!url) { // Check if the URL is undefined or empty
            console.error('No URL provided for obfuscation');
            return { obfuscated: null, map: {} };
        } else {
            console.error('is this ever called');
        }

        let obfuscated = url;

        const regex = /[:/._=?-]+/;
        const parts = url.split(regex).filter(part => part); // Ensure empty strings are removed
    
        const map = {};
        let charCode = 'a'.charCodeAt(0);
    
        parts.forEach(part => {
            // console.error('part is ', part);
            if (!map.hasOwnProperty(part)) {
                const char = '|' + String.fromCharCode(charCode) + '|'; // Delimiter added
                map[char] = part;
    
                // Replace only the first occurrence of 'part'
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
        // Update the log to correctly display the 'from' field of the mapping
        // console.error('obfuscating from ', existingMappings[i].from, ' -> ', existingMappings[i].new);

        // Correctly destructure 'from' and 'to' from each mapping
        const { old: oldMapping, new: newMapping } = existingMappings[i];
        
        // Assume obfuscateViaPair is a function that obfuscates the old and new mappings
        // This function needs to be defined elsewhere in your code
        const { obfuscated1: obfuscatedFrom, obfuscated2: obfuscatedTo, map } = obfuscateViaPair(oldMapping, newMapping);

        // Add the result to the obfuscatedExistingMappings array
        obfuscatedExistingMappings.push({ old: obfuscatedFrom, new: obfuscatedTo, map });
        // Update the log to correctly display the obfuscated 'from' and 'to' fields
        // console.error('to ', obfuscatedExistingMappings[i], obfuscatedTo);
        // console.error('from ', obfuscatedExistingMappings[i].from, ' -> ', obfuscatedExistingMappings[i].new);

    }

    return obfuscatedExistingMappings;
}

function obfuscateViaPair(url1, url2) {
    if (!url1 || !url2) {
        console.error('One or both URLs not provided for obfuscation');
        return { obfuscated1: null, obfuscated2: null, map: {} };
    }

    let obfuscated1 = url1;
    let obfuscated2 = url2;
    const regex = /[:/.=?-]+/;
    const parts1 = url1.split(regex).filter(part => part); 
    const parts2 = url2.split(regex).filter(part => part); 

    const map = {};
    let charCode = 'a'.charCodeAt(0);

    // Obfuscate url1 as before
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

    // Process url2 considering whether parts are in both arrays
    parts2.forEach(part => {
        if (parts1.includes(part)) { // If part is in both arrays, obfuscate as before
            if (!map.hasOwnProperty(part)) {
                const char = '|' + String.fromCharCode(charCode) + '|';
                map[part] = char;
                charCode++;
            }
        } else { // If part is unique to url2, do not obfuscate
            map[part] = part; // Keep part as is in map
        }
        // Replace part in url2 based on updated map logic
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

    console.error('Starting transformation via GPT for URL:', obfuscatedUrl);

    try {
        const systemMessage = "You are a 'pattern recognizer', a skilled entity at identifying patterns in URL transformations. Your task is to analyze the provided examples of URL mappings to understand common transformation patterns. Based on these patterns, predict the transformation for a new URL. Respond with the transformed URL only.";

        // Adjusting to ensure a back-and-forth conversation pattern
        //add ampersan as delimiter

        let simulatedConversation = [];
        obfuscatedExistingMappings.slice(0, 5).forEach(mapping => {
            simulatedConversation.push(
                { "role": "user", "content": `Transform ${mapping.old}` },
                { "role": "assistant", "content": `${mapping.new}` }
            );
        });

        // Add the current URL transformation task
        simulatedConversation.push({ "role": "user", "content": `Transform ${obfuscatedUrl}` });

        const messages = [
            { "role": "system", "content": systemMessage },
            ...simulatedConversation
        ];
        
        console.error("Payload being sent:", JSON.stringify({ messages }, null, 2));
        
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
            console.error(`Transformed URL received straight from GPT: ${transformedUrl}`);
            return transformedUrl;
        } else {
            throw new Error('Invalid response structure from OpenAI API');
        }
    } catch (error) {
        console.error('Error calling backend for OpenAI API:', error);
        return null;
    }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'getAllMappings' && sender.tab) {
        console.log('Bad status code TITLE:', statusCode);
        getAllMappings()
    }
});


  

async function getAllMappings() {
    try {
        console.error("Sending request to backend /mongodb endpoint");

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
            console.error('No mappings received from the backend.');
            return [];
        }

        console.error('All mappings received:', JSON.stringify(data));

        // Store the data in chrome.storage.local
        chrome.storage.local.set({ mappings: data }, () => {
            console.log('All mappings stored locally.');
        });

        return data;
    } catch (error) {
        console.error('Error calling backend for MongoDB:', error);
        return [];
    }
}



function initializeContentScript() {
    console.error('intialized');
    window.isContentScriptReady = true;
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
}

// Call the function to initialize the content script
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

function checkForUnusualRedirects() {
    console.log('check for unusal redirects');

    const navigationEntries = performance.getEntriesByType("navigation");
    let redirectScore = 0;

    navigationEntries.forEach((entry, index) => {
        if (index > 0 && navigationEntries[index - 1].name !== entry.name) {
            redirectScore += 1;
        }
    });

    return redirectScore;
}

// Function to check if a link is dead or alive
async function checkLinkStatus(url) {
    console.log('check link status');

    try {
        const response = await fetch(url, { method: 'GET' });
        const httpCode = response.status;
        const effectiveUrl = response.url;
        const effectiveUrlClean = cleanURL(effectiveUrl);

        if (httpCode >= 400 && httpCode < 600) {
            return true;
        }

        if (checkRedirectTo404(effectiveUrlClean)) {
            console.log('checkrediectto404 returned TRUE');
            return true;
        }

        if (effectiveUrlClean !== cleanURL(url)) {
            const possibleRoots = getDomainRoots(url);
            if (possibleRoots.includes(effectiveUrlClean)) {
                console.log('looked at the roots and TRUE');
                return true;
            }
        }

        if (httpCode === 0) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Fetch error: ", error.message);
        return true;
    }
}

// Function to clean the URL (remove scheme, 'www', trailing slash)
function cleanURL(url) {
    console.log('clean url');

    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '') + urlObj.pathname.replace(/\/$/, '');
    } catch (e) {
        console.error("Invalid URL: ", url);
        return '';
    }
}

// Function to get domain roots for a given URL
function getDomainRoots(url) {
    console.log('get domain roots');
    try {
        const urlObj = new URL(url);
        return [urlObj.hostname.replace('www.', ''), urlObj.origin.replace(/^https?:\/\//, '').replace('www.', '')];
    } catch (e) {
        console.error("Invalid URL: ", url);
        return [];
    }
}

function checkRedirectTo404(effectiveUrlClean) {
    console.log('check redirect to 404');
    return /\/404.htm|\/404\/|notfound|notfoundsoft/i.test(effectiveUrlClean);
}


// Receiving message to initiate scoring
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

    if (message.action === 'initiateScoring') {
        console.log('Received initiateScoring message for URL:', message.url);
        checkLinkStatus(message.url).then(isDead => {
            if (isDead) {
                console.log('Link is dead, displaying popup');
                chrome.runtime.sendMessage({ action: 'displayPopup' });
            } else {
                console.log('Link is alive, no action required');

            }
        });
        sendResponse({status: "Scoring initiated"});
    }
    return true;
});
function displayPopup(transformedUrl) {
    console.log("Content Script: Displaying popup");

    // Check if the popup already exists to avoid duplicates
    if (!document.getElementById('popup-container')) {
        const popupContainer = document.createElement('div');
        popupContainer.id = "popup-container";

        // Popup HTML content with new wording and close button as 'X'
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

        // CSS styles applied directly to the popup container
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

        // Close button event
        const closeButton = popupContainer.querySelector('#close-btn');
        closeButton.addEventListener("click", function() {
            document.body.removeChild(popupContainer);
        });

        // Archive button styling
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

        // Append the popup to the body
        document.body.appendChild(popupContainer);
    }
}
