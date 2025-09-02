<template>
    <Card style="width: 25rem; overflow: hidden">
    <template #header>
    </template>
    <template #title></template>
    <template #subtitle>Card subtitle</template>
    <template #content>
        <p class="m-0">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis esse, cupiditate neque
            quas!
        </p>
    </template>
    <template #footer>
        <div class="flex gap-4 mt-1">
            <Button label="Cancel" severity="secondary" variant="outlined" class="w-full" />
            <Button label="Save" class="w-full" />
        </div>
    </template>
    </Card>



</template>

<script setup>
import { ref } from 'vue';

const isLoginMode = ref(false)

const name = ref('');
const email = ref('');
const password = ref('');
const confPassword = ref('');

</script>

<style>


Card {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    min-height: 100vh;
}



</style>