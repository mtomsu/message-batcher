// Dependencies.
import { expect } from 'chai';
import 'mocha';
const sinon = require('sinon');
import { MessageBatcher, MessageBatcherOptions } from '../lib';

describe('MessageBatcher', () =>
{
	let defaultOptions: MessageBatcherOptions;
	let batcher: MessageBatcher;
	let singleMessage: any;
	let fullMessageBatch: any[];
	let partialMessageBatch: any[];

	beforeEach(() =>
	{
		// Configure.
		defaultOptions = { MaxBatchSize: 10, MaxDelay: 100, MinDelay: 10 };

		// Instantiate.
		batcher = new MessageBatcher(defaultOptions);

		// Mock data.
		singleMessage = {'singleMessage': 1};
		fullMessageBatch = [];
		partialMessageBatch = [];

		// Generate a full batch.
		for (let i: number = 1; i <= defaultOptions.MaxBatchSize; i++)
		{
			fullMessageBatch.push({'fullMessageBatch': i});
		}

		// Generate a partial batch.
		for (let i: number = 1; i <= defaultOptions.MaxBatchSize - 1; i++)
		{
			partialMessageBatch.push({'partialMessageBatch': i});
		}
	});

	afterEach(() =>
	{
		// Remove event listeners.
		batcher.removeAllListeners();
	});
	
	describe('constructor', () =>
	{
		it('should throw an error if MaxBatchSize is infinite', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: Infinity, MaxDelay: 100, MinDelay: 10}) }).to.throw('MessageBatcher MaxBatchSize option must be a finite number');
		});
		it('should throw an error if MaxBatchSize is less than 1', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 0, MaxDelay: 100, MinDelay: 10}) }).to.throw('MessageBatcher MaxBatchSize option cannot be less than 1');
		});
		it('should not throw an error if MaxBatchSize is valid', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 1, MaxDelay: 100, MinDelay: 10}) }).to.not.throw();
		});

		it('should throw an error if MaxDelay is infinite', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: Infinity, MinDelay: 0}) }).to.throw('MessageBatcher MaxDelay option must be a finite number');
		});
		it('should throw an error if MaxDelay is less than 0', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: -1, MinDelay: 0}) }).to.throw('MessageBatcher MaxDelay option cannot be less than 0');
		});
		it('should not throw an error if MaxDelay is valid', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: 0, MinDelay: 0}) }).to.not.throw();
		});

		it('should throw an error if MinDelay is infinite', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: 100, MinDelay: Infinity}) }).to.throw('MessageBatcher MinDelay option must be a finite number');
		});
		it('should throw an error if MinDelay is less than 0', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: 100, MinDelay: -1}) }).to.throw('MessageBatcher MinDelay option cannot be less than 0');
		});
		it('should throw an error if MinDelay is greater than MaxDelay', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: 10, MinDelay: 100}) }).to.throw('MessageBatcher MinDelay option cannot be greater than MaxDelay');
		});
		it('should not throw an error if MinDelay is valid', () =>
		{
			expect(() => {new MessageBatcher({MaxBatchSize: 10, MaxDelay: 100, MinDelay: 0}) }).to.not.throw();
		});
	});

	describe('Queue', () =>
	{
		it('should release the first full batch as soon as MaxBatchSize messages are received', () =>
		{
			// Spy.
			let spy: any = sinon.spy();

			// Receive batches.
			batcher.on('batch', spy);

			// Validate before.
			expect(spy.called).to.equal(false);

			// Add a full batch to the queue.
			batcher.Queue(fullMessageBatch);

			// Validate immediately after.
			expect(spy.called).to.equal(true);
		});

		it('should wait for MinDelay before emitting subsequent full batches', (done) =>
		{
			// Spy.
			let spy: any = sinon.spy();

			// Receive batches.
			batcher.on('batch', spy);

			// Validate immediately after.
			expect(spy.called).to.equal(false);

			// Add a full batch to the queue.
			batcher.Queue(fullMessageBatch);

			// Validate immediately after.
			expect(spy.calledOnce).to.equal(true);

			// Add another full batch.
			batcher.Queue(fullMessageBatch);

			// Validate immediately after.
			expect(spy.callCount).to.equal(1);
			
			// Validate after min delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(2);
				done();
			}, defaultOptions.MinDelay + 1);
		});

		it('should wait for MaxDelay before emitting a partial batch', (done) =>
		{
			// Spy.
			let spy: any = sinon.spy();

			// Receive batches.
			batcher.on('batch', spy);

			// Validate before.
			expect(spy.called).to.equal(false);

			// Add a partial batch to the queue.
			batcher.Queue(partialMessageBatch);

			// Validate immediately after.
			expect(spy.called).to.equal(false);

			// Validate after max delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(1);
				done();
			}, defaultOptions.MaxDelay + 1);
		});
		
		it('should transition from full batches to partial batch', (done) =>
		{
			// Spy.
			let spy: any = sinon.spy();

			// Receive batches.
			batcher.on('batch', spy);

			// Validate before.
			expect(spy.called).to.equal(false);

			// Add three full batches and a partial batch to the queue.
			batcher.Queue(fullMessageBatch);
			batcher.Queue(fullMessageBatch);
			batcher.Queue(fullMessageBatch);
			batcher.Queue(partialMessageBatch);

			// Validate immediately after.
			expect(spy.callCount).to.equal(1);

			// Validate after 3x min delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(3);
			}, defaultOptions.MinDelay * 3 + 1);

			// Validate after 3x min delay and 1x max delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(4);
				done();
			}, defaultOptions.MinDelay * 3 + defaultOptions.MaxDelay + 5);
		});

		it('should release periodic partial batches after max delay', (done) =>
		{
			// Spy.
			let spy: any = sinon.spy();

			// Receive batches.
			batcher.on('batch', spy);

			// Validate before.
			expect(spy.called).to.equal(false);

			// Add a message.
			batcher.Queue(singleMessage);
			
			// Validate immediately after.
			expect(spy.callCount).to.equal(0);

			// Validate after max delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(1);

				// Add another message.
				batcher.Queue(singleMessage);
			}, defaultOptions.MaxDelay + 5);

			// Validate after max delay.
			setTimeout(() =>
			{
				expect(spy.callCount).to.equal(2);

				done();
			}, defaultOptions.MaxDelay * 2 + 10);
		});
	});
});