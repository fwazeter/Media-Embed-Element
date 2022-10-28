/**
 * @module media-embed
 * @author Frank Wazeter
 * @description A custom element that speeds up embeds from YouTube & Vimeo & allows customization.
 * @property {string} src The YouTube or Vimeo link to embed.
 * @property {string} img A specific preview image to use (not in yet).
 */
export default class MediaEmbed extends HTMLElement {
	
	constructor() {
		super()
		
		const templateContent = this.templateLoader()
		
		const shadow = this.attachShadow( { mode: 'open' } )
		shadow.appendChild( templateContent.cloneNode( true ) )
		
		this.render()
	}
	
	// Allows programmatic access to change or modify tagName
	static get tagName() {
		return 'media-embed'
	}
	
	static get attributes() {
		return {
			src: 'src',
			img: 'img',
		}
	}
	
	static get observedAttributes() {
		return Object.values( MediaEmbed.attributes )
	}
	
	get src() {
		return this.getAttribute( 'src' )
	}
	
	set src( url ) {
		return this.setAttribute( 'src', url )
	}
	
	get img() {
		return this.getAttribute( 'img' )
	}
	
	set img( url ) {
		return this.setAttribute( 'img', url )
	}
	
	render() {
		
		const embed = this._setEmbedData( this.src )
		
		// Vimeo uses an API rather than URL for preview image, requiring a check here.
		if ( embed.type !== 'vimeo' ) {
			this._findTarget( 'src' ).setAttribute( 'src', `${ embed.image[0] }` )
		}
		
		
		this.addEventListener( 'click', () => this._onClick( embed.id, embed.iframe ) )
		
		
	}
	
	_setEmbedData( url ) {
		
		let embedData = {}
		
		const sources = {
			youTube: /(https?:\/\/)?(((m|www)\.)?(youtube(-nocookie)?|youtube.googleapis)\.com.*(v\/|v=|vi=|vi\/|e\/|embed\/|user\/.*\/u\/\d+\/)|youtu\.be\/)([_0-9a-z-]+)/i,
			vimeo:   /(https?:\/\/)?(player|www\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|)(\d+)(?:|\/\?)/i,
		}
		
		const type = url.includes( 'youtu' ) ? 'youtube' : url.includes( 'vimeo' ) ? 'vimeo' : 'invalid'
		
		switch ( type ) {
			
			case 'youtube':
				embedData.id = url.match( sources.youTube )[8]
				embedData.type = 'youtube'
				embedData.image =
					[ `https://i.ytimg.com/vi/${ embedData.id }/hqdefault.jpg` ]
				
				
				embedData.iframe = `https://www.youtube.com/embed/${ embedData.id }?autoplay=1&rel=0`
				
				return embedData
			
			case 'vimeo':
				embedData.id = url.match( sources.vimeo )[4]
				embedData.type = 'vimeo'
				
				embedData.image = []
				
				const vimeoAPI = `https://vimeo.com/api/v2/video/${ embedData.id }.json`
				
				let vimeoData = this._apiEmbedData( vimeoAPI )
				// in order to retrieve the URL from API & connect it the way we want, we have to add the tag here.
				vimeoData.then( ( result ) => {
					embedData.image.push(
						result[0]?.thumbnail_small, result[0].thumbnail_medium, result[0].thumbnail_large )
				} ).then( () => {
					this._findTarget( 'src' ).setAttribute( 'src', `${ embedData.image[2] }` )
				} )
				embedData.iframe =
					`https://player.vimeo.com/video/${ embedData.id }?autoplay=1&title=0&byline=0&portrait=0`
				return embedData
			
			default:
				break
		}
		
	}
	
	_findTarget( name ) {
		const tag = this.tagName.toLowerCase()
		for ( const element of this.shadowRoot.querySelectorAll( `[data-target~="${ tag }.${ name }"]` ) ) {
			if ( ! element.closest( tag ) ) return element
		}
	}
	
	async _apiEmbedData( url ) {
		
		const response = await fetch( url )
		return await response.json()
		
		
	}
	
	_onClick( id, embedSRC ) {
		
		const img = this._findTarget( 'src' )
		const iframe = this._findTarget( 'render' )
		const icon = this._findTarget( 'icon' )
		
		iframe.setAttribute( 'src', `${ embedSRC }` )
		iframe.setAttribute( 'frameborder', '0' )
		iframe.setAttribute( 'allowfullscreen', '1' )
		iframe.setAttribute( 'allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture' )
		
		img.setAttribute( 'hidden', 'true' )
		icon.setAttribute( 'hidden', 'true' )
		iframe.removeAttribute( 'hidden' )
		
	}
	
	templateLoader() {
		const template = document.getElementById( `${ this.tagName }` )
		
		return template ? template.content : defaultTemplate.content
	}
	
	connectedCallback() {
		this.render()
	}
	
	attributeChangedCallback() {
		this.render()
	}
}

/**
 * HTML Template fallback
 */
const defaultTemplate = document.createElement( 'template' )

defaultTemplate.innerHTML = `
	<style>
		:host {
			--border-radius: 0;
			--aspect-ratio: 4 / 3;
			--background: black;
			--color: red;
			display: grid;
			grid-template: "container" 1fr;
			place-items: center;
			aspect-ratio: var(--aspect-ratio);
			border-radius: var(--border-radius);
			overflow: hidden;
			background: var(--background);
			
		}
		
		:host > * {
			grid-area: container;
		}
		
		img, iframe {
			border-radius: var(--border-radius);
			block-size: 100%;
			inline-size: 100%;
			object-fit: cover;
		}
		
		@media (orientation: portrait) {
			:host {
				--aspect-ratio: 9 / 16;
			}
		}
		
		img, svg {
			cursor:pointer;
		}
		svg {
			inline-size: auto;
			block-size: 25%;
		}
	</style>
		<img data-target="${ MediaEmbed.tagName }.src" />
		<svg viewBox="0 0 25 25" fill="var(--color)" xmlns="http://www.w3.org/2000/svg" data-target="${ MediaEmbed.tagName }.icon">
			<path d="M21.8 8s-.195-1.377-.795-1.984c-.76-.797-1.613-.8-2.004-.847-2.798-.203-6.996-.203-6.996-.203h-.01s-4.197 0-6.996.202c-.39.046-1.242.05-2.003.846C2.395 6.623 2.2 8 2.2 8S2 9.62 2 11.24v1.517c0 1.618.2 3.237.2 3.237s.195 1.378.795 1.985c.76.797 1.76.77 2.205.855 1.6.153 6.8.2 6.8.2s4.203-.005 7-.208c.392-.047 1.244-.05 2.005-.847.6-.607.795-1.985.795-1.985s.2-1.618.2-3.237v-1.517C22 9.62 21.8 8 21.8 8zM9.935 14.595v-5.62l5.403 2.82-5.403 2.8z" />
		</svg>
		<iframe data-target="${ MediaEmbed.tagName }.render" hidden ></iframe>
		<slot name="text"></slot>
`

if ( 'customElements' in window ) {
	customElements.define( MediaEmbed.tagName, MediaEmbed )
}
