document.getElementById('baseUrl').innerText = window.location.href;

[...document.getElementsByClassName('example-base-url')].forEach((element) => {
    element.innerText = window.location.href;
});