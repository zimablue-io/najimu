export interface DemoSegment {
	/** Exact text, including any trailing space and punctuation. */
	text: string
	changed: boolean
}

export interface DemoExample {
	id: string
	/** Short tab label. */
	label: string
	/** Who reaches for this pairing. */
	useCase: string
	sourceLocale: string
	targetLocale: string
	sourceName: string
	targetName: string
	source: DemoSegment[]
	target: DemoSegment[]
}

const seg = (text: string, changed = false): DemoSegment => ({ text, changed })

export const DEMO_EXAMPLES: DemoExample[] = [
	{
		id: 'regional-variants',
		label: 'Regional variants',
		useCase: 'Marketing copy for the UK market',
		sourceLocale: 'en-US',
		targetLocale: 'en-GB',
		sourceName: 'English (US)',
		targetName: 'English (UK)',
		source: [
			seg('Mom ', true),
			seg('parked the car. Her '),
			seg('favorite ', true),
			seg('color ', true),
			seg('is on the '),
			seg('soccer ', true),
			seg('jersey.'),
		],
		target: [
			seg('Mum ', true),
			seg('parked the car. Her '),
			seg('favourite ', true),
			seg('colour ', true),
			seg('is on the '),
			seg('football ', true),
			seg('jersey.'),
		],
	},
	{
		id: 'legal-contracts',
		label: 'Legal & contracts',
		useCase: 'Contract terms, reviewed paragraph by paragraph',
		sourceLocale: 'en-US',
		targetLocale: 'es-MX',
		sourceName: 'English (US)',
		targetName: 'Spanish (Mexico)',
		source: [seg('Payment is due '), seg('within thirty days ', true), seg('of the invoice date.')],
		target: [seg('El pago vence '), seg('dentro de treinta días ', true), seg('de la fecha de la factura.')],
	},
	{
		id: 'technical-docs',
		label: 'Technical docs',
		useCase: 'Docs for a Japanese-speaking team',
		sourceLocale: 'en-US',
		targetLocale: 'ja-JP',
		sourceName: 'English (US)',
		targetName: 'Japanese (Japan)',
		// A script without spaces has no word boundaries to align on, so the whole line is the change.
		source: [seg('Update the configuration file, then restart the server.', true)],
		target: [seg('設定ファイルを更新してから、サーバーを再起動してください。', true)],
	},
]
