<script lang="ts">
  import {
    BadAlreadySolvedChallenge,
    GoodFlag,
    SubmitFlagRouteV2,
    type Challenge,
  } from '@rctf/types'
  import { showApiError } from '$lib/api'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import {
    IconCheck,
    IconInfo,
    IconPaperPlaneTilt,
    IconSignIn,
    IconPlus,
    IconX,
  } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { resolveSubmitState } from './submit-ladder'

  interface Props {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const flagPlaceholder = $derived(
    clientConfig?.flagFormatPlaceholder ?? 'flag{...}'
  )

  const endTime = $derived(clientConfig?.endTime ?? Number.POSITIVE_INFINITY)

  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)

  let now = $state(Date.now())

  const submitState = $derived(
    resolveSubmitState({ isArchived, endTime, now, isAuthenticated, isSolved })
  )

  $effect(() => {
    if (submitState === 'archived' || submitState === 'ended') return
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  let aiLinksArray = $state([''])
  let selectedFileName = $state('')
  const form = useApiForm(SubmitFlagRouteV2, {
    onSuccess: response => {
      if (response.kind === GoodFlag.kind) {
        toast.success('Flag correct!')
        onSolve(challenge.id)
        form.setData({ flag: '', aiChatLinks: '', solverFile: undefined })
        aiLinksArray = ['']
        selectedFileName = ''
      } else if (response.kind === BadAlreadySolvedChallenge.kind) {
        toast.info('You already solved this challenge')
        onSolve(challenge.id)
      }
    },
    onError: response => {
      showApiError(response)
    },
  })

  $effect(() => {
    form.data.id = challenge.id
  })

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const flag = (form.data.flag ?? '').trim()
    const links = aiLinksArray.map(l => l.trim()).filter(Boolean)
    const isDidNotUseAi = links.some(l => l.toLowerCase() === 'i did not use ai')
    
    if (!flag || links.length === 0) return
    
    const finalLinks = isDidNotUseAi ? '' : links.join('\n')
    
    form.setData({ 
      flag, 
      aiChatLinks: finalLinks,
      didNotUseAi: isDidNotUseAi ? 'true' : undefined 
    })
    form.submit()
  }
</script>

<challenge-submit>
  {#if submitState === 'archived'}
    <submit-notice>
      <IconInfo />
      <span>The CTF is archived.</span>
    </submit-notice>
  {:else if submitState === 'ended'}
    <submit-notice>
      <IconInfo />
      <span>The CTF has ended.</span>
    </submit-notice>
  {:else if submitState === 'login'}
    <Button href="/login">
      <IconSignIn />
      Login to submit
    </Button>
  {:else}
    <form onsubmit={handleSubmit}>
      {#if submitState !== 'solved'}
        <label for="ai-chat-links-0">AI chat links</label>
        <div class="ai-links-container">
          {#each aiLinksArray as link, i}
            <div class="ai-link-row">
              <input
                id="ai-chat-links-{i}"
                type="text"
                placeholder='https://... or "I did not use AI"'
                disabled={form.submitting}
                bind:value={aiLinksArray[i]}
                class="ai-link-input"
                aria-invalid={!!form.errors.aiChatLinks || undefined}
              />
              {#if i > 0 || aiLinksArray.length > 1}
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Remove link"
                  onclick={() => aiLinksArray.splice(i, 1)}
                  disabled={form.submitting}
                >
                  <IconX />
                </button>
              {/if}
              {#if i === aiLinksArray.length - 1}
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Add link"
                  onclick={() => aiLinksArray.push('')}
                  disabled={form.submitting || aiLinksArray.length >= 10}
                >
                  <IconPlus />
                </button>
              {/if}
            </div>
          {/each}
        </div>
        {#if form.errors.aiChatLinks}
          <p role="alert">{form.errors.aiChatLinks}</p>
        {/if}
        <label for="solver-file">Solver script/image (optional, max 2 MB)</label>
        <input id="solver-file" type="file"
          accept=".py,.js,.ts,.sh,.c,.cpp,.go,.rs,.txt,.png,.jpg,.jpeg,.webp"
          disabled={form.submitting}
          onchange={event => {
            const file = event.currentTarget.files?.[0]
            selectedFileName = file?.name ?? ''
            form.setData({ solverFile: file })
          }} />
        {#if selectedFileName}<small>{selectedFileName}</small>{/if}
        {#if form.errors.solverFile}<p role="alert">{form.errors.solverFile}</p>{/if}
      {/if}
      {#if form.errors._form}<p role="alert">{form.errors._form}</p>{/if}
      <submit-row>
        {#if submitState === 'solved'}
          <submit-notice data-tone="success">
            <IconCheck />
            <span>Challenge solved!</span>
          </submit-notice>
        {:else}
          <Input
            type="text"
            placeholder={flagPlaceholder}
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            data-flag-input
            aria-label="Flag"
            required
            aria-invalid={!!form.errors._form || undefined}
            disabled={form.submitting}
            bind:value={form.data.flag}
          />
        {/if}
        <button
          type="submit"
          aria-label="Submit flag"
          disabled={form.submitting ||
            submitState === 'solved' ||
            !form.data.flag?.trim() ||
            aiLinksArray.every(l => !l.trim())}
        >
          {#if form.submitting}
            <Spinner />
          {:else}
            <IconPaperPlaneTilt />
          {/if}
        </button>
      </submit-row>
    </form>
  {/if}
</challenge-submit>

<style>
  challenge-submit {
    display: block;
    --submit-block-size: 3rem;

    :global(a[data-variant]) {
      gap: 0.5rem;
      inline-size: 100%;
      block-size: var(--submit-block-size);
      font-size: 1.25rem;
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label:not(.option) {
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  .option { display: flex; align-items: center; gap: 0.5rem; }

  textarea, input[type='file'], input[type='text'].ai-link-input {
    inline-size: 100%;
    min-inline-size: 0;
    padding: 0.5rem;
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
  }

  .ai-links-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ai-link-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .icon-btn {
    block-size: 2.3rem;
    inline-size: 2.3rem;
    padding-inline: 0;
    border-radius: var(--radius-md);
    background: var(--background-l3);
  }

  submit-row {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    block-size: var(--submit-block-size);

    :global(input[data-flag-input]) {
      flex: 1;
      min-inline-size: 0;
      block-size: var(--submit-block-size);
      font-family: var(--font-mono);
      font-size: 1.25rem;
      border-radius: var(--radius-lg);

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }

  submit-notice {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.75rem;
    min-inline-size: 0;
    block-size: var(--submit-block-size);
    padding-inline: 0.75rem;
    font-size: 1.25rem;
    color: var(--foreground-l3);
    background: var(--background-l4);
    border-radius: var(--radius-lg);

    &[data-tone='success'] {
      color: var(--foreground-success);
      background: var(--background-success);
    }

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }
  }

  button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    padding-inline: 1rem;
    block-size: var(--submit-block-size);
    color: var(--foreground-l4);
    background: var(--background-l4);
    cursor: pointer;
    border-radius: var(--radius-lg);

    &:hover:enabled {
      background: var(--background-l5);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    :global(svg) {
      inline-size: 1.5rem;
      block-size: 1.5rem;
    }
  }
</style>
