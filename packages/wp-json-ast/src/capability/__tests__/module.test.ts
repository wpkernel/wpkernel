import { buildCapabilityModule } from '../module';
import type { CapabilityModuleConfig } from '../types';

describe('buildCapabilityModule', () => {
	it('emits a capability helper program with registrar methods and docblocks', () => {
		const config: CapabilityModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Capability',
			capabilityMap: {
				sourcePath: 'src/capability-map.ts',
				definitions: [
					{
						key: 'demo.create',
						capability: 'create_demo',
						appliesTo: 'resource',
						source: 'map',
					},
					{
						key: 'demo.update',
						capability: 'edit_demo',
						appliesTo: 'object',
						binding: 'id',
						source: 'map',
					},
				],
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'capability-map.binding.missing',
						message: 'Binding missing for capability.',
						context: { capability: 'demo.update' },
					},
				],
			},
		};

		const result = buildCapabilityModule(config);
		expect(result.files).toHaveLength(1);

		const file = result.files[0];
		expect(file).toBeDefined();
		if (!file) {
			throw new Error('Expected capability module to emit a file.');
		}

		expect(file.fileName).toBe('Capability/Capability.php');
		expect(file.metadata).toEqual({
			kind: 'capability-helper',
			map: {
				sourcePath: 'src/capability-map.ts',
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				definitions: [
					{
						key: 'demo.create',
						capability: 'create_demo',
						appliesTo: 'resource',
						binding: undefined,
						source: 'map',
					},
					{
						key: 'demo.update',
						capability: 'edit_demo',
						appliesTo: 'object',
						binding: 'id',
						source: 'map',
					},
				],
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'capability-map.binding.missing',
						message: 'Binding missing for capability.',
						context: { capability: 'demo.update' },
					},
				],
			},
		});
		expect(file.docblock).toEqual([
			'Source: wpk.config.ts → capability-map (src/capability-map.ts)',
		]);
		expect(file.uses).toEqual(['WP_Error', 'WP_REST_Request']);

		const [declareStmt, namespaceStmt] = file.program;
		expect(declareStmt).toMatchObject({ nodeType: 'Stmt_Declare' });
		expect(namespaceStmt).toMatchObject({
			nodeType: 'Stmt_Namespace',
			name: expect.objectContaining({
				parts: ['Demo', 'Plugin', 'Capability'],
			}),
		});

		const namespaceBody = (
			namespaceStmt as {
				stmts?: unknown[];
			}
		).stmts as Array<{ nodeType?: string }> | undefined;
		expect(namespaceBody?.[0]).toMatchObject({ nodeType: 'Stmt_Use' });
		expect(namespaceBody?.[1]).toMatchObject({ nodeType: 'Stmt_Use' });
		const classStmt = namespaceBody?.find(
			(entry) => entry?.nodeType === 'Stmt_Class'
		) as { stmts?: any[] } | undefined;
		expect(classStmt?.stmts?.map((stmt) => stmt.name.name)).toEqual([
			'capability_map',
			'fallback',
			'callback',
			'resolve_capability',
			'enforce',
			'get_definition',
			'get_binding',
			'create_error',
		]);

		const capabilityMapMethod = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'capability_map'
		) as { stmts?: any[] } | undefined;
		const returnStmt = capabilityMapMethod?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		const entries = returnStmt?.expr?.items as Array<{
			key: { value: string };
			value: { items: Array<{ key?: { value: string }; value: any }> };
		}>;
		expect(entries?.map((entry) => entry.key.value)).toEqual([
			'demo.create',
			'demo.update',
		]);
		const updateEntry = entries?.find(
			(entry) => entry.key.value === 'demo.update'
		);
		const bindingItem = updateEntry?.value.items.find(
			(item) => item.key?.value === 'binding'
		);
		expect(bindingItem?.value).toMatchObject({
			nodeType: 'Scalar_String',
			value: 'id',
		});
	});

	it('forwards warnings through the provided hook', () => {
		const warnings: unknown[] = [];
		const config: CapabilityModuleConfig = {
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Capability',
			capabilityMap: {
				definitions: [],
				fallback: {
					capability: 'manage_demo',
					appliesTo: 'resource',
				},
				missing: ['demo.delete'],
				unused: ['demo.view'],
				warnings: [
					{
						code: 'capability-map.binding.missing',
						message: 'Binding missing for capability.',
					},
				],
			},
			hooks: {
				onWarning: (warning) => warnings.push(warning),
			},
		};

		buildCapabilityModule(config);

		expect(warnings).toEqual([
			{
				kind: 'capability-map-warning',
				warning: {
					code: 'capability-map.binding.missing',
					message: 'Binding missing for capability.',
					context: undefined,
				},
			},
			{
				kind: 'capability-definition-missing',
				capability: 'demo.delete',
				fallbackCapability: 'manage_demo',
				fallbackScope: 'resource',
			},
			{
				kind: 'capability-definition-unused',
				capability: 'demo.view',
				scope: undefined,
			},
		]);
	});
});
