$(document).ready(() => {
    $('select').formSelect();
    const durationSelect = $('#duration')
    chrome.storage.local.get(['duration'], (result) => {
        $('option:selected').removeAttr('selected')
        $('#duration option[value="' + result.duration + '"]').prop('selected', true)
    })

    const keepGroupOpenInput = $('#keepGroupOpen')
    deriveInputState(keepGroupOpenInput)

    const keepOpenInput = $('#keepOpen')
    deriveInputState(keepOpenInput)

    keepOpenInput.click(() => {
        chrome.runtime.sendMessage({
            keepOpen: 'CLICK'
        }, (response) => {
            console.log(response)
        })
    })

    durationSelect.change(() => {
        chrome.runtime.sendMessage({
            duration: $("select#duration option:selected").val()
        }, (response) => {
            console.log(response)
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
        console.log(node.id)
    }

}
