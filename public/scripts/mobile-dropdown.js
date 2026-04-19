/**
 * Mobile dropdown toggle for .zones-nav and .services-nav
 * Adds tap-to-toggle behavior on screens ≤920px where CSS :hover doesn't work.
 * Desktop behavior (hover) is unchanged.
 */
(function () {
  'use strict';

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
