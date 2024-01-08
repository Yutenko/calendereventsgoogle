
class ScriptLoader {
  constructor (options) {
    const { src, global } = options
    this.src = src
    this.global = global
    this.isLoaded = false
  }

  loadStyle () {
    return new Promise((resolve, reject) => {
      // Create script element and set attributes
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.async = true
      link.href = this.src

      // Append the script to the DOM
      document.head.appendChild(link)

      // Resolve the promise once the script is loaded
      link.addEventListener('load', () => {
        this.isLoaded = true
        resolve(link)
      })

      // Catch any errors while loading the script
      link.addEventListener('error', () => {
        reject(new Error(`${this.src} failed to load.`))
      })
    })
  }

  loadScript () {
    return new Promise((resolve, reject) => {
      // Create script element and set attributes
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = this.src

      // Append the script to the DOM
      document.head.appendChild(script)

      // Resolve the promise once the script is loaded
      script.addEventListener('load', () => {
        this.isLoaded = true
        resolve(script)
      })

      // Catch any errors while loading the script
      script.addEventListener('error', () => {
        reject(new Error(`${this.src} failed to load.`))
      })
    })
  }

  load (type) {
    return new Promise(async (resolve, reject) => {
      if (!this.isLoaded) {
        try {
          if (type==='style') {
            await this.loadStyle()
          }
          else {
            await this.loadScript()
          }
          resolve(window[this.global])
        } catch (e) {
          reject(e)
        }
      } else {
        resolve(window[this.global])
      }
    })
  }
}

// #############################################
// #############################################
// #############################################
// #############################################

class ATimeliner {
  constructor () {
    this.calendarId = 'rrk263fjgdqogtqcrpvonijfe0@group.calendar.google.com'
    this.API_KEY = 'AIzaSyDRuPp92G5xXOl1r-_djctAtVP7PdPShdU'
    this.userTimeZone = "Europe/Zurich"
    this.scriptName = 'calendarEventsGoogle.js'
    this.scriptTag = null
    this.title = ''
    this.subtitle = ''
    this.timelineElement = null
  }

 async init () {
  this.polyfillCurrentScript(window.document)
  this.setScriptDomElement()

  const loadGoogleApi = new ScriptLoader({ src: 'https://apis.google.com/js/api.js', global: 'Segment' })
  const loadMomentJS = new ScriptLoader({ src: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/moment.min.js', global: 'Segment' })
  const loadMomentJSLocaleCH = new ScriptLoader({ src: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.24.0/locale/de-ch.js', global: 'Segment' })
  const loadStyle = new ScriptLoader({ src: 'https://destrudo.de/calendareventsgoogle/style.css?v=1', global: 'Segment' })

  await loadGoogleApi.load()
  await loadMomentJS.load()
  await loadMomentJSLocaleCH.load()
  await loadStyle.load('style')

  moment.locale('de')

  this.loadGApi()
 }

 loadGApi () {
   gapi.load('client',
    () => this.getData(
     (data) => this.addTimelineStub(
      (parent) => {
        if (data.length > 0) {
          for (let i = 0; i < data.length; i++) {
           this.addTimelineItem2(data[i],parent)
          }
          this.addPlugin()
        } else {
          this.noEventsPage(parent)
        }
      }
     )
    )
   )
 }


 getData (cb) {
  gapi.client.init({
   apiKey: this.API_KEY,
   discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  }).then(() => {
   return gapi.client.calendar.events.list({
     calendarId: this.calendarId,
     timeZone: this.userTimeZone,
     singleEvents: true,
     showDeleted:false,
     timeMin: (new Date()).toISOString(), //gathers only events not happened yet
     maxResults: 20,
     orderBy: 'startTime'
    })
   }).then((res) => {
    if (res.result.items) {
     cb(res.result.items)
    } else cb([])
   })
 }

 addTimelineStub (cb) {
  let stub = `<section class="agenda" id="timeline"></agenda>`
  const d = document.createElement('div')
  d.innerHTML = stub

  this.replaceScriptTagWithTimeline(d)
  this.timelineElement = document.getElementById('timeline')
  cb(this.timelineElement)
 }

 noEventsPage (parent) {
   const entry = `<div class="noEventsText font_7">
     <p> Zur Zeit sind keine Auftritte geplant </p>
    </div>
   `

   const d = document.createElement('div')
   d.classList.add('agendaItemWrap')
   d.innerHTML = entry

   parent.appendChild(d)
 }

 getDayName (d) {
   var days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
   var d = new Date(d);
   console.log(d);
   return d ? days[d.getDay()] : "";
 }


 addTimelineItem2 (data,parent) {
  let start = {}, end = {}, theDate = '', theTime = '', hasTime = true, timestampStart = null, timestampEnd = null
  if (data.start.date) {
    hasTime = false
    timestampStart = data.start.date
    timestampEnd = data.end.date
  }
  else if (data.start.dateTime) {
    hasTime = true
    timestampStart = data.start.dateTime
    timestampEnd = data.end.dateTime
  }

  start = {
    month:moment(timestampStart).format('MMMM'),
    day:moment(timestampStart).format('DD'),
    year:moment(timestampStart).format('YYYY'),
    time:hasTime ? moment(timestampStart).format('HH:mm') : ''
  }
  end = {
    month:moment(timestampEnd).format('MMMM'),
    day:data.end.date ? moment(timestampEnd).subtract(1,'d').format('DD') : moment(timestampEnd).format('DD'),
    year:moment(timestampEnd).format('YYYY'),
    time:hasTime ? moment(timestampEnd).format('HH:mm') : ''
  }
  // same day
  if (start.month === end.month && start.day === end.day && start.year === end.year) {
    theDate = start.day+'. '+start.month+' '+start.year
  } else {
    theDate = start.day+'. '+start.month+' - '+end.day+'. '+end.month+' '+end.year
  }
  if (hasTime) {
    theTime = '| '+start.time+' - '+end.time+' Uhr'
  }


 let { summary, location, htmlLink, description, attachments } = data
 let image = attachments && attachments[0] && attachments[0].fileUrl ? this.getImageLink(attachments[0].fileUrl) : IMAGE_PLACEHOLDER
 summary = summary ? summary : ''
 description = description ? description : ''
 location = !location || location === 'undefined' ? 'Schweiz' : location
 let dayName = this.getDayName(data.start.date ? data.start.date : data.start.dateTime)

  const entry = `<a target="_blank" href=http://www.google.com/maps?q=${encodeURIComponent(location)}" class="mapsIcon">
    <img src="https://destrudo.de/calendareventsgoogle/mapsIcon.png" alt=""/>
   </a>
   <div class="agendaItem">
    <div class="agendaItem__image">
     <div class="agendaItem__image__wrap">
      <div>
        <img class="agendaItem__image__img" src="${image}">
      </div>
     </div>
   </div>
   <div class="agendaItem__summary">
    <h3 class="d-title d-titleText agendaItem__title font_7">
     <span style="color: rgb(255, 96, 85);">${summary}</span>
    </h3>
    <div class="d-when agendaItem__when font_7">
     <span style="font-weight:400">${dayName} | </span>
     <span>${theDate}</span>
     <span style="font-weight:400">${theTime}</span>
    </div>
    <div class="d-text d-text--preview agendaItem__what l-custom font_7">
     ${description}
    </div>

   </div>
  </div>
  `

  // <div class="agendaItem__buttons">
  //  <a href="${htmlLink}"><button class="btn btn--orange">Zum Kalendar hinzufügen</button></a>
  // </div>

  const d = document.createElement('div')
  d.classList.add('agendaItemWrap')
  d.innerHTML = entry

  parent.appendChild(d)
 }


 addTimelineItem (data,parent) {
   const start = {
     month:moment(data.start.dateTime).format('MMMM'),
     day:moment(data.start.dateTime).format('DD'),
     year:moment(data.start.dateTime).format('YYYY'),
     time:moment(data.start.dateTime).format('HH:mm')
   }
   const end = {
     month:moment(data.end.dateTime).format('MMMM'),
     day:moment(data.end.dateTime).format('DD'),
     year:moment(data.end.dateTime).format('YYYY'),
     time:moment(data.end.dateTime).format('HH:mm')
   }

   let { summary, location, htmlLink, description, attachments } = data
   let image = attachments && attachments[0] && attachments[0].fileUrl ? this.getImageLink(attachments[0].fileUrl) : IMAGE_PLACEHOLDER
   summary = summary ? summary : ''
   description = description ? description : ''



   const entry = `<div class="cd-timeline__img cd-timeline__img--picture">
    <div class="timeline-icon-text"> ${start.day} </div>
   </div>

   <div class="cd-timeline__content text-component">
    <div class="card">
     <div class="card-inner">
      <div class="month">${start.month} <a href="${htmlLink}" class="addtocalendar card-action-button">Zum Kalender hinzufügen</a> </div>
      <div class="card-details">
       <h2 class="card-head">${summary}</h2>
       <p>${description}</p>
      </div>
      <div>
       <a class="clock icon" title="Clock" style="vertical-align:middle"></a>
       <span>${start.time} - ${end.time} Uhr</span>

      </div>
     </div>
      ${(image?`<div style="background-image:url(${image})" class="card-media" />`:'')}
    </div>
   </div>

   `

  const d = document.createElement('div')
  d.classList.add('cd-timeline__block')
  d.innerHTML = entry

  parent.appendChild(d)
 }

 getImageLink (link) {
   const regex = /.*[^-\w]([-\w]{25,})[^-\w]?.*/
   return link.replace(regex,'https://drive.google.com/uc?export=view&id=$1')
 }

 addPlugin () {
  (function(){
     // Vertical Timeline - by CodyHouse.co
   	function VerticalTimeline( element ) {
   		this.element = element;
   		this.blocks = this.element.getElementsByClassName("cd-timeline__block");
   		this.images = this.element.getElementsByClassName("cd-timeline__img");
   		this.contents = this.element.getElementsByClassName("cd-timeline__content");
   		this.offset = 0.8;
   		this.hideBlocks();
   	};

   	VerticalTimeline.prototype.hideBlocks = function() {
   		if ( !"classList" in document.documentElement ) {
   			return; // no animation on older browsers
   		}
   		//hide timeline blocks which are outside the viewport
   		var self = this;
   		for( var i = 0; i < this.blocks.length; i++) {
   			(function(i){
   				if( self.blocks[i].getBoundingClientRect().top > window.innerHeight*self.offset ) {
   					self.images[i].classList.add("cd-timeline__img--hidden");
   					self.contents[i].classList.add("cd-timeline__content--hidden");
   				}
   			})(i);
   		}
   	};

   	VerticalTimeline.prototype.showBlocks = function() {
   		if ( ! "classList" in document.documentElement ) {
   			return;
   		}
   		var self = this;
   		for( var i = 0; i < this.blocks.length; i++) {
   			(function(i){
   				if( self.contents[i].classList.contains("cd-timeline__content--hidden") && self.blocks[i].getBoundingClientRect().top <= window.innerHeight*self.offset ) {
   					// add bounce-in animation
   					self.images[i].classList.add("cd-timeline__img--bounce-in");
   					self.contents[i].classList.add("cd-timeline__content--bounce-in");
   					self.images[i].classList.remove("cd-timeline__img--hidden");
   					self.contents[i].classList.remove("cd-timeline__content--hidden");
   				}
   			})(i);
   		}
   	};

   	var verticalTimelines = document.getElementsByClassName("js-cd-timeline"),
   		verticalTimelinesArray = [],
   		scrolling = false;
   	if( verticalTimelines.length > 0 ) {
   		for( var i = 0; i < verticalTimelines.length; i++) {
   			(function(i){
   				verticalTimelinesArray.push(new VerticalTimeline(verticalTimelines[i]));
   			})(i);
   		}

   		//show timeline blocks on scrolling
   		window.addEventListener("scroll", function(event) {
   			if( !scrolling ) {
   				scrolling = true;
   				(!window.requestAnimationFrame) ? setTimeout(checkTimelineScroll, 250) : window.requestAnimationFrame(checkTimelineScroll);
   			}
   		});
   	}

   	function checkTimelineScroll() {
   		verticalTimelinesArray.forEach(function(timeline){
   			timeline.showBlocks();
   		});
   		scrolling = false;
   	};
  })();
 }

 setScriptDomElement () {
   const id = 'script-'+Math.random()
   document.currentScript.id = id
   this.scriptTag = document.getElementById(id)
 }

 replaceScriptTagWithTimeline (timeline) {
   this.scriptTag.parentNode.replaceChild(timeline, this.scriptTag)
 }

 polyfillCurrentScript (document) {
   var currentScript = "currentScript",
       scripts = document.getElementsByTagName('script'); // Live NodeList collection

   // If browser needs currentScript polyfill, add get currentScript() to the document object
   if (!(currentScript in document)) {
     Object.defineProperty(document, currentScript, {
       get: function(){

         // IE 6-10 supports script readyState
         // IE 10+ support stack trace
         try { throw new Error(); }
         catch (err) {

           // Find the second match for the "at" string to get file src url from stack.
           // Specifically works with the format of stack traces in IE.
           var i, res = ((/.*at [^\(]*\((.*):.+:.+\)$/ig).exec(err.stack) || [false])[1];

           // For all scripts on the page, if src matches or if ready state is interactive, return the script tag
           for(i in scripts){
             if(scripts[i].src == res || scripts[i].readyState == "interactive"){
               return scripts[i];
             }
           }

           // If no match, return null
           return null;
         }
       }
     })
   }
 }




}

const IMAGE_PLACEHOLDER = 'data:image/png;base64,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'

const Timeliner = new ATimeliner()
Timeliner.init()
