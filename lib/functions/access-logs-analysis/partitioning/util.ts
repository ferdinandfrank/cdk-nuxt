import {
  AthenaClient,
  GetQueryExecutionCommand,
  QueryExecutionState,
  StartQueryExecutionCommand,
} from '@aws-sdk/client-athena';

/**
 * Executes the given command and waits up to 10s for the command to complete.
 * @param failOnTimeout <code>true</code> in order to throw an exception,
 * or <code>false</code> to just log the error to the console
 * @return <code>true</code> on success or <code>false</code> if the command timed out and
 * <code>failOnTimeout</code> was set to false
 */
export const executeAndAwaitResponse = async (
  command: StartQueryExecutionCommand,
  failOnTimeout: boolean
): Promise<boolean> => {
  console.log('executing command ', command.input.QueryString, '...');

  const athena = new AthenaClient({});
  const response = await athena.send(command);

  // wait up to 10s for completion
  const checkStatus = new GetQueryExecutionCommand({
    QueryExecutionId: response.QueryExecutionId,
  });

  for (let i = 1; i <= 50; i++) {
    const state = await athena.send(checkStatus);
    switch (state.QueryExecution!.Status!.State) {
      case QueryExecutionState.SUCCEEDED:
        console.log('command completed successfully');
        return true;
      case QueryExecutionState.CANCELLED:
      case QueryExecutionState.FAILED:
        // noinspection TypeScriptUnresolvedFunction
        throw new Error('Command execution failed! Query:\n' + command.input.QueryString);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const errorMessage = 'Status of partition creation unknown - waited for 10s but command did not complete';
  if (failOnTimeout) {
    // noinspection TypeScriptUnresolvedFunction
    throw new Error(errorMessage);
  } else {
    console.error(errorMessage);
  }
  return false;
};
