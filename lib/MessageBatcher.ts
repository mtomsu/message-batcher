// Dependencies.
import { EventEmitter } from 'events';
import * as _ from 'lodash';
import { MessageBatcherOptions } from './MessageBatcherOptions';

// Define required options.
const requiredOptions: string[] =
[
	'MaxBatchSize',
	'MaxDelay',
	'MinDelay',
];

// Validate the specified options.
const validate = (options: MessageBatcherOptions) =>
{
	// Loop through required options.
	requiredOptions.forEach((requiredOption: string) =>
	{
		// Was the required option specified?
		if (!options.hasOwnProperty(requiredOption))
		{
			throw new Error(`Missing required MessageBatcher option: ${requiredOption}`);
		}
	});

	// Validate batch size.
	if (isNaN(options.MaxBatchSize))
	{
		throw new Error(`MessageBatcher MaxBatchSize option must be a number`);
	}
	if (!isFinite(options.MaxBatchSize))
	{
		throw new Error(`MessageBatcher MaxBatchSize option must be a finite number`);
	}
	if (options.MaxBatchSize < 1)
	{
		throw new Error(`MessageBatcher MaxBatchSize option cannot be less than 1`);
	}

	// Validate maximum delay before a partial batch is released.
	if (isNaN(options.MaxDelay))
	{
		throw new Error(`MessageBatcher MaxDelay option must be a number`);
	}
	if (!isFinite(options.MaxDelay))
	{
		throw new Error(`MessageBatcher MaxDelay option must be a finite number`);
	}
	if (options.MaxDelay < 0)
	{
		throw new Error(`MessageBatcher MaxDelay option cannot be less than 0`);
	}

	// Validate minimum delay before a partial batch is released.
	if (isNaN(options.MinDelay))
	{
		throw new Error(`MessageBatcher MinDelay option must be a number`);
	}
	if (!isFinite(options.MinDelay))
	{
		throw new Error(`MessageBatcher MinDelay option must be a finite number`);
	}
	if (options.MinDelay < 0)
	{
		throw new Error(`MessageBatcher MinDelay option cannot be less than 0`);
	}
	if (options.MinDelay > options.MaxDelay)
	{
		throw new Error(`MessageBatcher MinDelay option cannot be greater than MaxDelay`);
	}
};

export class MessageBatcher extends EventEmitter
{
	// Store queued messages.
	protected fifo: any[] = [];

	// Store config.
	protected options: MessageBatcherOptions;
	
	// Store debounced methods.
	protected releaseBatchDebouncedMin: any;
	protected releaseBatchDebouncedMax: any;

	// Flag to prevent waiting on first batch.
	protected firstBatch: boolean = true;
	
	// Instantiate.
	constructor(options: MessageBatcherOptions)
	{
		// Call parent constructor.
		super();

		// Validate.
		validate(options);

		// Store options.
		this.options = options;

		// Create debounced methods to release batches.
		this.releaseBatchDebouncedMax = _.debounce(this.releaseBatch.bind(this), this.options.MaxDelay, { 'maxWait': this.options.MaxDelay });
		this.releaseBatchDebouncedMin = _.debounce(this.releaseBatch.bind(this), this.options.MinDelay, { 'maxWait': this.options.MinDelay });

		// Method chaining.
		return this;
	}

	// Fill the queue.
	public Queue(messages: any[] | any): void
	{
		// Convert single messages to an array.
		messages = [].concat(messages);

		// Loop through messages.
		messages.forEach((message: any) =>
		{
			// Add message to FIFO.
			this.fifo.push(message);

			// Call a debounced method depending on queue length.
			this.debounce(this.fifo, this.options.MaxBatchSize);
		}, this);
	}

	// Call one of the debounced methods depending on queue length.
	protected debounce(fifo: any[], batchSize: number): void
	{
		// Are there any messages left in the queue?
		if (fifo.length > 0)
		{
			// Does the FIFO contain a full batch?
			if (fifo.length >= batchSize)
			{
				// Is this the first batch?
				if (this.firstBatch)
				{
					// Update flag.
					this.firstBatch = false;

					// Flush immediately.
					this.releaseBatchDebouncedMax.flush();
				}
				else
				{
					// Cancel long debounce method.
					this.releaseBatchDebouncedMax.cancel();
					
					// Call the short debounced method to enforce the minimum delay between batches.
					this.releaseBatchDebouncedMin(fifo, batchSize);
				}
			}
			else
			{
				// Cancel short debounce method.
				this.releaseBatchDebouncedMin.cancel();

				// Call the long debounced method until we have a full batch, or max delay elapses.
				this.releaseBatchDebouncedMax(fifo, batchSize);
			}
		}
	}

	// Attempt to release a batch of messages.
	protected releaseBatch(fifo: any[], batchSize: number): void
	{
		// Get a batch.
		let batch: any[] = this.drainFIFO(fifo, batchSize);

		// Any messages?
		if (batch && batch.length)
		{
			// Release a batch.
			this.emit('batch', batch);

			// Continue draining the queue.
			this.debounce(fifo, batchSize);
		}
	}

	// Drain a batch from the queue.
	protected drainFIFO(fifo: any[], batchSize: number): any[]
	{
		// Is the queue empty?
		return fifo.length > 0 ? fifo.splice(0, batchSize) : fifo;
	}
}