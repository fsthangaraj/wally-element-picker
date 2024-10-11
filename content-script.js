const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

window.tabEvents = [];
let previousEventTime = null;

if(urlParams.get('waeaouuid')){
  ['click'].forEach((eventType) => {
    document.addEventListener(eventType, (e) => {
      const targetSelector = getSelector(e.target);
      const targetXpathGenerator2 = 'xpath/' + computeXPath(e.target);
      recordEvent(e, targetSelector, targetXpathGenerator2);
    });
  });
  ['mouseover'].forEach((eventType) => {
    document.addEventListener(eventType, (e) => {
      e.target.style.border = '2px solid red';
    });
  });
  ['mouseout'].forEach((eventType) => {
    document.addEventListener(eventType, (e) => {
      e.target.style.border = '';
    });
  });
}

function recordEvent(e, targetSelector, targetXpathGenerator2) {
  const data = {
    uuid: urlParams.get('waeaouuid'),
    css_selector: targetSelector,
    xpath: targetXpathGenerator2,
    element: e.target.outerHTML, 
  };
  fetch('https://wally-selector-add-element.adaweb.workers.dev/', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
        })
        .then((response) => {
          window.close();
        });
}

function getSelector(element) {
  if (!element) return null;
  if (element.id) return `#${element.id}`;
  const parentSelector = getSelector(element.parentElement);
  const tag = element.tagName.toLowerCase();
  const index = element.parentElement
    ? Array.from(element.parentElement?.children).indexOf(element) + 1
    : 1;
  return parentSelector
    ? `${parentSelector} > ${tag}:nth-child(${index})`
    : `${tag}:nth-child(${index})`;
}
