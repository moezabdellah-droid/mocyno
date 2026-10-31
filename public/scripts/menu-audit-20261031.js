/**
 * Mobile dropdown toggle for .zones-nav and .services-nav
 * Adds tap-to-toggle behavior on screens ≤920px where CSS :hover doesn't work.
 * Desktop behavior (hover) is unchanged.
 */
(function () {
  'use strict';
  if (window.MOCYNO_MOBILE_MENU_READY) return;
  window.MOCYNO_MOBILE_MENU_READY = true;

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.zones-trigger, .services-trigger');

    if (trigger && window.innerWidth <= 920) {
      e.preventDefault();
      e.stopPropagation();
      var nav = trigger.parentElement;
      var wasOpen = nav.classList.contains('is-open');

      // Close all other open menus first
      document.querySelectorAll('.zones-nav.is-open, .services-nav.is-open').forEach(function (el) {
        if (el !== nav) el.classList.remove('is-open');
      });

      // Toggle the clicked one
      if (wasOpen) {
        nav.classList.remove('is-open');
      } else {
        nav.classList.add('is-open');
      }
      return;
    }

    // Click outside any dropdown → close all
    if (!e.target.closest('.zones-nav, .services-nav')) {
      document.querySelectorAll('.zones-nav.is-open, .services-nav.is-open').forEach(function (el) {
        el.classList.remove('is-open');
      });
    }
  });

  // Also close dropdowns when the main menu is closed
  var menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      // Small delay to let the menu toggle animation start
      setTimeout(function () {
        var links = document.querySelector('.nav .links');
        if (links && !links.classList.contains('open')) {
          document.querySelectorAll('.zones-nav.is-open, .services-nav.is-open').forEach(function (el) {
            el.classList.remove('is-open');
          });
        }
      }, 50);
    });
  }
})();

(function(){
  var button=document.querySelector('.menu-toggle'), menu=document.querySelector('.nav .links'), overlay=document.querySelector('.nav-overlay');
  if(!button||!menu)return;
  function sync(){button.setAttribute('aria-expanded',menu.classList.contains('open')?'true':'false');}
  new MutationObserver(sync).observe(menu,{attributes:true,attributeFilter:['class']});sync();
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&menu.classList.contains('open')){menu.classList.remove('open');if(overlay)overlay.classList.remove('show');sync();button.focus();}});
})();
