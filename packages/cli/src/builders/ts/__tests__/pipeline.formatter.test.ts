import { buildProject } from '../utils';
import { buildTsFormatter } from '../formatter';

jest.mock('../utils', () => ({
	buildProject: jest.fn(() => ({
		createSourceFile: jest.fn(() => ({
			formatText: jest.fn(),
			getFullText: jest.fn(() => 'formatted output'),
			forget: jest.fn(),
		})),
	})),
}));

const mockedBuildProject = jest.mocked(buildProject);

describe('buildTsFormatter', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('formats source files using the default project factory', async () => {
		const formatter = buildTsFormatter();
		const result = await formatter.format({
			filePath: '/tmp/example.ts',
			contents: 'const value=1;',
		});

		expect(mockedBuildProject).toHaveBeenCalledTimes(1);
		const project = mockedBuildProject.mock.results[0]?.value;
		expect(project.createSourceFile).toHaveBeenCalledWith(
			'/tmp/example.ts',
			'const value=1;',
			{ overwrite: true }
		);
		const source = project.createSourceFile.mock.results[0]?.value;
		expect(source.formatText).toHaveBeenCalledWith({
			ensureNewLineAtEndOfFile: true,
		});
		expect(source.getFullText).toHaveBeenCalled();
		expect(source.forget).toHaveBeenCalled();
		expect(result).toBe('formatted output');
	});

	it('allows overriding the project factory', async () => {
		const formatText = jest.fn();
		const getFullText = jest.fn(() => 'custom formatted');
		const forget = jest.fn();
		const createSourceFile = jest.fn(() => ({
			formatText,
			getFullText,
			forget,
		}));
		const projectFactory = jest.fn(() => ({ createSourceFile }));

		const formatter = buildTsFormatter({ projectFactory });
		const result = await formatter.format({
			filePath: '/tmp/custom.ts',
			contents: 'export const value = 2;',
		});

		expect(projectFactory).toHaveBeenCalledTimes(1);
		expect(createSourceFile).toHaveBeenCalledWith(
			'/tmp/custom.ts',
			'export const value = 2;',
			{ overwrite: true }
		);
		expect(formatText).toHaveBeenCalledWith({
			ensureNewLineAtEndOfFile: true,
		});
		expect(getFullText).toHaveBeenCalled();
		expect(forget).toHaveBeenCalled();
		expect(result).toBe('custom formatted');
	});
});
