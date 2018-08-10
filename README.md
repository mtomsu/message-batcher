# message-batcher
Queue messages and emit them in batches once the configured batch size is reached, or after a configurable period of time (whichever happens first).


----
## Installation
`npm install message-batcher`


## Usage
### Import
```typescript
import { MessageBatcher, MessageBatcherOptions } from 'message-batcher';
```

### Configure
```typescript
let options: MessageBatcherOptions = { MaxBatchSize: 10, MaxDelay: 1000, MinDelay: 10 };
let batcher: MessageBatcher = new MessageBatcher(options);
```

### Receive batches
```typescript
batcher.on('batch', (batch: any[]) =>
{
	// Do something with batch.
});
```

### Queue a single message for batching
```typescript
batcher.Queue({'a': 1});
```

### Queue an array of messages for batching
```typescript
batcher.Queue([{'a': 1, 'b': 2}]);
```

### Example: Minimize SQS FIFO requests
```typescript
import { MessageBatcher } from 'message-batcher'

// Instantiate.
let batcher: MessageBatcher = new MessageBatcher({ MaxBatchSize: 10, MaxDelay: 100, MinDelay: 10 });

// Receive batches.
batcher.on('batch', (messages: any[]) =>
{
	// Log it.
	console.info(new Date().getTime(), `Received batch with ${messages.length} messages`);

	// Produce to SQS FIFO.
});

// Generate some messages in quick succession.
for (let i: number = 1; i <= 25; i++)
{
	// Log it.
	console.info(new Date().getTime(), `Adding message ${i}`);

	// Push message to queue.
	batcher.Queue({'msg': i});
}
```

#### Example output
```
1533941987767 'Adding message 1'
1533941987769 'Adding message 2'
1533941987769 'Adding message 3'
1533941987769 'Adding message 4'
1533941987769 'Adding message 5'
1533941987769 'Adding message 6'
1533941987769 'Adding message 7'
1533941987770 'Adding message 8'
1533941987770 'Adding message 9'
1533941987770 'Adding message 10'
1533941987770 'Received batch with 10 messages'
1533941987770 'Adding message 11'
1533941987770 'Adding message 12'
1533941987770 'Adding message 13'
1533941987771 'Adding message 14'
1533941987771 'Adding message 15'
1533941987771 'Adding message 16'
1533941987771 'Adding message 17'
1533941987771 'Adding message 18'
1533941987771 'Adding message 19'
1533941987771 'Adding message 20'
1533941987771 'Adding message 21'
1533941987771 'Adding message 22'
1533941987771 'Adding message 23'
1533941987772 'Adding message 24'
1533941987772 'Adding message 25'
1533941987783 'Received batch with 10 messages'
1533941987884 'Received batch with 5 messages'
```


----
## API
### `constructor(options)`
Create a MessageBatcher instance.
#### options
 * `MaxBatchSize`*\** - *Number* - Maximum number of messages in a batch
 * `MaxDelay`*\** - *Number* - Maximum delay in milliseconds before a partial batch is released
 * `MinDelay`*\** - *Number* - Minimum delay in milliseconds before subsequent batches are released

*\*Required*

### `Queue(messages)`
Add a single message or an array of messages to the queue.

### Events
MessageBatcher is an [EventEmitter](https://nodejs.org/api/events.html) and emits the following events:
| Event | Params | Description |
| ----- | ------ | ----------- |
| `batch` | `[messages]` | Fired when at least one message has been added to the queue.  Not fired sooner than MinDelay, and not fired later than MaxDelay. |


----
## Test
`npm test`


## Build
`npm run build`
