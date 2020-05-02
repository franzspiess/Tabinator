$(document).ready(() => {
    $('select').formSelect();
    const durationSelect = $('#duration')
    chrome.storage.local.get(['duration'], (result) => {
        $('option:selected').removeAttr('selected')
        $('#duration option[value="' + result.duration + '"]').prop('selected', true)
    })
    const keepOpenInput = $('#keepOpen')
    deriveInputState(keepOpenInput)

    const keepGroupOpenInput = $('#keepGroupOpen')
    deriveInputState(keepGroupOpenInput)

    durationSelect.change(() => {
        chrome.runtime.sendMessage({
            duration: $("select#duration option:selected").val()
        }, (response) => {
            console.log(response)
        })
    })

    keepOpenInput.click(() => {
        chrome.runtime.sendMessage({
            keepOpen: 'CLICK'
        }, (response) => {
            console.log(response, 'KEEPOPEN')
        })
    })

    keepGroupOpenInput.click(() => {
        chrome.runtime.sendMessage({
            keepGroupOpen: 'CLICK'
        }, (response) => {
            console.log(response, 'KEEPGROUPOPEN')
        })
    })




})

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        console.log(request, sender, sendResponse)
    }
)

function deriveInputState(node) {
    const id = node.attr('id')
    console.log(id)
    if (id === 'keepOpen') {
        chrome.storage.local.get(['openTabs', 'currentTab'], (response) => {
            node.prop('checked', response.openTabs.includes(response.currentTab))
        })
    }
    if (id === 'keepGroupOpen') {
        chrome.storage.local.get(['openGroups', 'currentTab'], (response) => {
            chrome.tabs.query({active:true},([tab]) => {
                console.log('A')
                response.openGroups.forEach((url) => {
                    console.log(tab.url.indexOf(url))
                    if (tab.url.indexOf(url) !== -1) {
                        node.prop('checked')
                    }
                })
            })
        })
    }

}
